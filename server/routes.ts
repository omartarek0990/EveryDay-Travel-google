import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import { z } from 'zod';
import {
  clearFailedLogins,
  countOwners,
  createSessionForUser,
  createUser,
  deleteAllSessions,
  deleteOtherSessions,
  deleteSessionByToken,
  extractTokenFromRequest,
  findFirstOwner,
  findOwnerByUsername,
  findUserById,
  getClientIp,
  hashPassword,
  isLoginLocked,
  recordFailedLogin,
  requireOwner,
  resolveOwnerFromRequest,
  runDummyHashCheck,
  setSessionCookie,
  clearSessionCookie,
  updateUser,
  verifyPassword,
  type AuthenticatedRequest,
} from './auth.ts';
import { buildPublicPayload, getDb, hydrateTrips, saveDb } from './db.ts';
import { ensureLocalUploadDir, getImageStorage, imageVariantBasePath, imageVariantObjectId, sanitizeUploadKey, staticStorage } from './storage.ts';
import { translateEntriesBatch } from './translation.ts';
import {
  changePasswordSchema,
  destinationInputSchema,
  localizedTextSchema,
  loginSchema,
  normalizeEgyptianWhatsapp,
  resetAccountSchema,
  setupOwnerSchema,
  tripInputSchema,
  updateAccountSchema,
  updateHomeSettingsSchema,
  updateSiteSettingsSchema,
  validatePasswordStrength,
} from '../src/shared/schemas.ts';
import { slugifyAscii } from '../src/shared/format.ts';
import type { ImageRecord, LocalizedText } from '../src/shared/types.ts';

const ALLOWED_IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const signRateWindow = new Map<string, { count: number; resetAt: number }>();

function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
}

function checkSignRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = signRateWindow.get(key);
  if (!entry || entry.resetAt <= now) {
    signRateWindow.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 40) return false;
  entry.count += 1;
  return true;
}

function isImageReferencedElsewhere(
  db: ReturnType<typeof getDb>,
  imageId: string,
  exclude?: { tripId?: string; galleryId?: string }
): boolean {
  if (
    db.siteSettings.logoImageId === imageId ||
    db.siteSettings.faviconImageId === imageId ||
    db.siteSettings.ogImageId === imageId
  ) {
    return true;
  }
  if (db.heroImages.some((h) => h.imageId === imageId)) return true;
  if (db.tripImages.some((ti) => ti.imageId === imageId && ti.tripId !== exclude?.tripId)) {
    return true;
  }
  if (db.galleryImages.some((g) => g.imageId === imageId && g.id !== exclude?.galleryId)) {
    return true;
  }
  return false;
}

async function cleanupOrphanImages(imageIds: string[]): Promise<void> {
  const db = getDb();
  const storage = getImageStorage();
  const remaining: ImageRecord[] = [];
  for (const img of db.images) {
    if (imageIds.includes(img.id) && !isImageReferencedElsewhere(db, img.id)) {
      await storage.destroy(img.publicId);
    } else {
      remaining.push(img);
    }
  }
  db.images = remaining;
  await saveDb(db);
}

export function createApiRouter(): Router {
  const router = express.Router();

  // ---- PUBLIC ----
  router.get('/public/site', (_req, res) => {
    const db = getDb();
    res.json(buildPublicPayload(db));
  });

  // ---- AUTH ----
  router.get(
    '/auth/me',
    asyncHandler(async (req, res) => {
      const needsSetup = (await countOwners()) === 0;
      const user = await resolveOwnerFromRequest(req);
      const recoveryConfigured = Boolean(process.env.OWNER_RECOVERY_CODE?.trim());

      res.json({
        needsSetup,
        recoveryConfigured,
        user: user
          ? {
              id: user.id,
              username: user.username,
              role: user.role,
              mustChangePassword: user.mustChangePassword,
            }
          : null,
      });
    })
  );

  router.post(
    '/auth/setup',
    asyncHandler(async (req, res) => {
      if ((await countOwners()) > 0) {
        res.status(409).json({ error: 'تم إعداد حساب المالك بالفعل.' });
        return;
      }

      const parsed = setupOwnerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' });
        return;
      }

      const pwError = validatePasswordStrength(parsed.data.password, parsed.data.username);
      if (pwError) {
        res.status(400).json({ error: pwError });
        return;
      }

      const passwordHash = await hashPassword(parsed.data.password);

      let user;
      try {
        user = await createUser({
          username: parsed.data.username,
          passwordHash,
          role: 'OWNER',
          mustChangePassword: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message.toLowerCase().includes('duplicate')) {
          res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل.' });
          return;
        }
        throw err;
      }

      const { token } = await createSessionForUser(user.id);
      setSessionCookie(req, res, token);
      res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      });
    })
  );

  router.post(
    '/auth/login',
    asyncHandler(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        return;
      }

      const username = parsed.data.username.toLowerCase();
      const ip = getClientIp(req);

      if (await isLoginLocked(username, ip)) {
        res.status(429).json({
          error: 'تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار 15 دقيقة والمحاولة مجدداً.',
        });
        return;
      }

      const user = await findOwnerByUsername(username);

      if (!user) {
        await runDummyHashCheck(parsed.data.password);
        await recordFailedLogin(username, ip);
        res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        return;
      }

      const valid = await verifyPassword(parsed.data.password, user.passwordHash);
      if (!valid) {
        await recordFailedLogin(username, ip);
        res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        return;
      }

      await clearFailedLogins(username, ip);
      const { token } = await createSessionForUser(user.id);
      setSessionCookie(req, res, token);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      });
    })
  );

  router.post(
    '/auth/logout',
    asyncHandler(async (req, res) => {
      const { token } = extractTokenFromRequest(req);
      if (token) {
        await deleteSessionByToken(token);
      }
      clearSessionCookie(req, res);
      res.json({ ok: true });
    })
  );

  router.post(
    '/auth/change-password',
    requireOwner,
    asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' });
        return;
      }

      const user = req.ownerUser!;
      const currentValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
      if (!currentValid) {
        res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
        return;
      }

      const strengthError = validatePasswordStrength(parsed.data.newPassword, user.username);
      if (strengthError) {
        res.status(400).json({ error: strengthError });
        return;
      }

      await updateUser(user.id, {
        passwordHash: await hashPassword(parsed.data.newPassword),
        mustChangePassword: false,
      });
      await deleteOtherSessions(user.id, req.sessionToken);

      res.json({ ok: true });
    })
  );

  router.post(
    '/auth/update-account',
    requireOwner,
    asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const parsed = updateAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' });
        return;
      }

      const user = req.ownerUser!;
      const currentValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
      if (!currentValid) {
        res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
        return;
      }

      const nextUsername = parsed.data.username || user.username;
      const nextPassword = parsed.data.newPassword?.trim() ? parsed.data.newPassword : null;

      if (nextPassword) {
        const strengthError = validatePasswordStrength(nextPassword, nextUsername);
        if (strengthError) {
          res.status(400).json({ error: strengthError });
          return;
        }
      }

      let updated;
      try {
        updated = await updateUser(user.id, {
          username: nextUsername,
          passwordHash: nextPassword ? await hashPassword(nextPassword) : undefined,
          mustChangePassword: nextPassword ? false : undefined,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message.toLowerCase().includes('duplicate')) {
          res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل.' });
          return;
        }
        throw err;
      }

      await deleteOtherSessions(user.id, req.sessionToken);

      res.json({
        ok: true,
        user: {
          id: updated.id,
          username: updated.username,
          role: updated.role,
          mustChangePassword: updated.mustChangePassword,
        },
      });
    })
  );

  router.post(
    '/auth/reset-account',
    asyncHandler(async (req, res) => {
      const expectedCode = process.env.OWNER_RECOVERY_CODE?.trim();
      if (!expectedCode) {
        res.status(503).json({
          error:
            'ميزة الاسترداد غير مفعّلة بعد. أضف المتغير OWNER_RECOVERY_CODE في إعدادات البيئة على الخادم أولاً.',
        });
        return;
      }

      const ip = getClientIp(req);
      if (await isLoginLocked('__owner_recovery__', ip)) {
        res.status(429).json({
          error: 'تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار 15 دقيقة والمحاولة مجدداً.',
        });
        return;
      }

      const parsed = resetAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' });
        return;
      }

      const submittedDigest = crypto.createHash('sha256').update(parsed.data.recoveryCode).digest();
      const expectedDigest = crypto.createHash('sha256').update(expectedCode).digest();
      if (!crypto.timingSafeEqual(submittedDigest, expectedDigest)) {
        await recordFailedLogin('__owner_recovery__', ip);
        res.status(401).json({ error: 'رمز الاسترداد غير صحيح' });
        return;
      }

      const strengthError = validatePasswordStrength(parsed.data.newPassword, parsed.data.username);
      if (strengthError) {
        res.status(400).json({ error: strengthError });
        return;
      }

      await clearFailedLogins('__owner_recovery__', ip);

      const passwordHash = await hashPassword(parsed.data.newPassword);
      const existingOwner = await findFirstOwner();

      const owner = existingOwner
        ? await updateUser(existingOwner.id, {
            username: parsed.data.username,
            passwordHash,
            mustChangePassword: false,
          })
        : await createUser({
            username: parsed.data.username,
            passwordHash,
            role: 'OWNER',
            mustChangePassword: false,
          });

      await deleteAllSessions();
      const { token } = await createSessionForUser(owner.id);
      setSessionCookie(req, res, token);

      res.json({
        token,
        user: {
          id: owner.id,
          username: owner.username,
          role: owner.role,
          mustChangePassword: owner.mustChangePassword,
        },
      });
    })
  );

  // ---- UPLOADS (OWNER ONLY) ----
  router.post(
    '/uploads/sign',
    requireOwner,
    asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const ip = getClientIp(req);
      if (!checkSignRateLimit(`${req.ownerUser!.id}:${ip}`)) {
        res.status(429).json({ error: 'طلبات رفع كثيرة جداً. انتظر دقيقة وحاول مجدداً.' });
        return;
      }
      const folder =
        typeof req.body?.folder === 'string'
          ? req.body.folder.replace(/[^a-z0-9/_-]/gi, '')
          : 'everyday';
      const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName : undefined;
      const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : undefined;
      const key = typeof req.body?.key === 'string' ? req.body.key : undefined;
      const storage = getImageStorage();
      res.json(await storage.signUpload(folder || 'everyday', { fileName, mimeType, key }));
    })
  );

  router.post(
    '/uploads/local',
    requireOwner,
    express.raw({ type: ['image/*', 'application/octet-stream'], limit: '26mb' }),
    (req: AuthenticatedRequest, res) => {
      const folder = String(req.headers['x-upload-folder'] || 'everyday');
      const exp = String(req.headers['x-upload-exp'] || '');
      const nonce = String(req.headers['x-upload-nonce'] || '');
      const signature = String(req.headers['x-upload-signature'] || '');
      const key = sanitizeUploadKey(String(req.headers['x-upload-key'] || '')) ?? undefined;

      if (!staticStorage.verifyUploadSignature({ folder, exp, nonce, signature, key })) {
        res.status(403).json({ error: 'توقيع الرفع غير صالح أو منتهي الصلاحية' });
        return;
      }

      const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const ext = ALLOWED_IMAGE_MIME_TO_EXT[contentType];
      if (!ext) {
        res.status(400).json({ error: 'صيغة الملف غير مدعومة (JPEG, PNG, WebP, HEIC فقط)' });
        return;
      }

      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length === 0 || body.length > 25 * 1024 * 1024) {
        res.status(400).json({ error: 'حجم الصورة يجب أن يكون أقل من 25 ميجابايت' });
        return;
      }

      const uploadDir = ensureLocalUploadDir();
      const fileName = `${key ?? crypto.randomUUID()}.${ext}`;
      const targetPath = path.resolve(uploadDir, fileName);
      if (!targetPath.startsWith(uploadDir + path.sep)) {
        res.status(400).json({ error: 'مسار غير صالح' });
        return;
      }
      fs.writeFileSync(targetPath, body);

      const width = Math.min(2560, Math.max(100, Number(req.headers['x-upload-width']) || 1600));
      const height = Math.min(2560, Math.max(100, Number(req.headers['x-upload-height']) || 1200));

      res.json({
        public_id: `local/${fileName}`,
        url: `/uploads/${fileName}`,
        width,
        height,
        bytes: body.length,
        format: ext,
      });
    }
  );

  router.post(
    '/uploads/verify',
    requireOwner,
    asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const schema = z.object({
        publicId: z.string().min(1),
        widthHint: z.number().int().positive().max(2560).optional(),
        heightHint: z.number().int().positive().max(2560).optional(),
        avgColor: z
          .string()
          .regex(/^#[0-9a-f]{6}$/i)
          .nullish(),
        variants: z
          .object({
            format: z.enum(['webp', 'jpg']),
            widths: z.array(z.number().int().positive()).min(1).max(6),
          })
          .nullish(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'بيانات الصورة غير صالحة' });
        return;
      }

      try {
        const storage = getImageStorage();
        const verified = await storage.verify(parsed.data.publicId);
        const useClientDimensions = verified.provider !== 'CLOUDINARY';
        const sourceWidth = parsed.data.widthHint ?? verified.width;

        // Responsive variants are optional: old clients never send them, so the
        // row keeps a single original URL. When variants are declared we refuse
        // the row unless every variant object really exists in storage.
        let variants: ImageRecord['variants'] = null;
        if (parsed.data.variants && verified.provider !== 'CLOUDINARY') {
          const format = parsed.data.variants.format;
          const widths = Array.from(new Set(parsed.data.variants.widths))
            .filter((width) => width <= sourceWidth)
            .sort((a, b) => a - b);

          if (widths.length > 0) {
            const objectIds = widths.map((width) =>
              imageVariantObjectId(verified.provider, verified.publicId, width, format)
            );
            const found = await Promise.all(objectIds.map((objectId) => storage.exists(objectId)));
            if (found.some((exists) => !exists)) {
              res.status(400).json({ error: 'تعذر التحقق من نسخ الصورة المرفوعة' });
              return;
            }
            variants = {
              format,
              widths,
              basePath: imageVariantBasePath(verified.provider, verified.publicId),
            };
          }
        }

        const image: ImageRecord = {
          id: crypto.randomUUID(),
          provider: verified.provider,
          publicId: verified.publicId,
          url: storage.url(
            { provider: verified.provider, publicId: verified.publicId, url: verified.url },
            { width: 1600 }
          ),
          width:
            useClientDimensions && parsed.data.widthHint ? parsed.data.widthHint : verified.width,
          height:
            useClientDimensions && parsed.data.heightHint ? parsed.data.heightHint : verified.height,
          bytes: verified.bytes,
          format: verified.format,
          variants,
          avgColor: parsed.data.avgColor ?? null,
          createdAt: new Date().toISOString(),
        };

        const db = getDb();
        db.images.push(image);
        await saveDb(db);
        res.status(201).json({ image });
      } catch (err) {
        console.error('Image verify failed:', err);
        res.status(400).json({ error: 'تعذر التحقق من الصورة المرفوعة' });
      }
    })
  );

  // ---- ADMIN DATA ----
  router.get('/admin/data', requireOwner, (_req, res) => {
    const db = getDb();
    const imageMap = new Map(db.images.map((i) => [i.id, i]));
    res.json({
      settings: {
        ...db.siteSettings,
        logoImage: db.siteSettings.logoImageId ? imageMap.get(db.siteSettings.logoImageId) ?? null : null,
        faviconImage: db.siteSettings.faviconImageId ? imageMap.get(db.siteSettings.faviconImageId) ?? null : null,
        ogImage: db.siteSettings.ogImageId ? imageMap.get(db.siteSettings.ogImageId) ?? null : null,
      },
      heroImages: [...db.heroImages]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((h) => ({ ...h, image: imageMap.get(h.imageId) }))
        .filter((h) => Boolean(h.image)),
      destinations: [...db.destinations].sort((a, b) => a.sortOrder - b.sortOrder),
      trips: hydrateTrips(db, true),
      galleryImages: [...db.galleryImages]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((g) => ({ ...g, image: imageMap.get(g.imageId) }))
        .filter((g) => Boolean(g.image)),
      images: db.images,
    });
  });

  // ---- ADMIN HOME & HERO ----
  router.put('/admin/home', requireOwner, async (req, res) => {
    const parsed = updateHomeSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' });
      return;
    }

    const forceFields = new Set<string>(Array.isArray(req.body?.forceTranslateFields) ? req.body.forceTranslateFields : []);
    const db = getDb();
    const prev = db.siteSettings;
    const input = parsed.data;

    const entries: Array<{ path: string; next: LocalizedText; prev?: LocalizedText | null; force?: boolean }> = [
      { path: 'heroBadge', next: input.heroBadge, prev: prev.heroBadge, force: forceFields.has('heroBadge') },
      { path: 'heroTitle', next: input.heroTitle, prev: prev.heroTitle, force: forceFields.has('heroTitle') },
      { path: 'heroSubtitle', next: input.heroSubtitle, prev: prev.heroSubtitle, force: forceFields.has('heroSubtitle') },
      { path: 'heroDescription', next: input.heroDescription, prev: prev.heroDescription, force: forceFields.has('heroDescription') },
    ];

    input.heroFeatures.forEach((f, idx) => {
      entries.push({
        path: `heroFeatures.${idx}`,
        next: f,
        prev: prev.heroFeatures[idx],
        force: forceFields.has(`heroFeatures.${idx}`),
      });
    });

    input.whyUsItems.forEach((item, idx) => {
      const prevItem = prev.whyUsItems.find((p) => p.id === item.id) || prev.whyUsItems[idx];
      entries.push(
        { path: `whyUs.${idx}.title`, next: item.title, prev: prevItem?.title, force: forceFields.has(`whyUs.${idx}.title`) },
        { path: `whyUs.${idx}.body`, next: item.body, prev: prevItem?.body, force: forceFields.has(`whyUs.${idx}.body`) }
      );
    });

    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch(entries);

    const oldHeroIds = db.heroImages.map((h) => h.imageId);
    db.siteSettings = {
      ...prev,
      heroBadge: resolved.get('heroBadge')!,
      heroTitle: resolved.get('heroTitle')!,
      heroSubtitle: resolved.get('heroSubtitle')!,
      heroDescription: resolved.get('heroDescription')!,
      heroFeatures: input.heroFeatures.map((_, idx) => resolved.get(`heroFeatures.${idx}`)!),
      heroIntervalSeconds: input.heroIntervalSeconds,
      showTripsSection: input.showTripsSection,
      showWhyUsSection: input.showWhyUsSection,
      showGallerySection: input.showGallerySection,
      showContactSection: input.showContactSection,
      whyUsItems: input.whyUsItems.map((item, idx) => ({
        id: item.id,
        title: resolved.get(`whyUs.${idx}.title`)!,
        body: resolved.get(`whyUs.${idx}.body`)!,
      })),
    };

    const validImageSet = new Set(db.images.map((i) => i.id));
    db.heroImages = input.heroImageIds
      .filter((id) => validImageSet.has(id))
      .map((imageId, idx) => ({
        id: crypto.randomUUID(),
        imageId,
        sortOrder: idx,
      }));

    await saveDb(db);
    const removedIds = oldHeroIds.filter((id) => !input.heroImageIds.includes(id));
    if (removedIds.length > 0) {
      await cleanupOrphanImages(removedIds);
    }

    res.json({ ok: true, failedFields: failedPaths, translatedChars });
  });

  // ---- ADMIN SETTINGS ----
  router.put('/admin/settings', requireOwner, async (req, res) => {
    const parsed = updateSiteSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' });
      return;
    }

    const forceFields = new Set<string>(Array.isArray(req.body?.forceTranslateFields) ? req.body.forceTranslateFields : []);
    const db = getDb();
    const prev = db.siteSettings;
    const input = parsed.data;

    const localizedFields = [
      'companyName',
      'address',
      'whatsappMessage',
      'seoTitle',
      'seoDescription',
      'aboutTitle',
      'aboutBody',
      'tripsIntro',
      'galleryTitle',
      'contactIntro',
      'footerTagline',
    ] as const;

    const entries = localizedFields.map((key) => ({
      path: key,
      next: input[key],
      prev: prev[key],
      force: forceFields.has(key),
    }));

    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch(entries);

    const oldAssetIds = [prev.logoImageId, prev.faviconImageId, prev.ogImageId].filter(
      (id): id is string => Boolean(id)
    );

    const normalizedWhatsapp = input.whatsapp
      ? normalizeEgyptianWhatsapp(input.whatsapp)
      : input.phone
        ? normalizeEgyptianWhatsapp(input.phone)
        : '';

    db.siteSettings = {
      ...prev,
      companyName: resolved.get('companyName')!,
      logoImageId: input.logoImageId,
      faviconImageId: input.faviconImageId,
      phone: input.phone,
      whatsapp: normalizedWhatsapp,
      email: input.email,
      address: resolved.get('address')!,
      mapUrl: input.mapUrl,
      tiktokUrl: input.tiktokUrl,
      facebookUrl: input.facebookUrl,
      instagramUrl: input.instagramUrl,
      whatsappMessage: resolved.get('whatsappMessage')!,
      seoTitle: resolved.get('seoTitle')!,
      seoDescription: resolved.get('seoDescription')!,
      ogImageId: input.ogImageId,
      aboutTitle: resolved.get('aboutTitle')!,
      aboutBody: resolved.get('aboutBody')!,
      tripsIntro: resolved.get('tripsIntro')!,
      galleryTitle: resolved.get('galleryTitle')!,
      contactIntro: resolved.get('contactIntro')!,
      footerTagline: resolved.get('footerTagline')!,
    };

    await saveDb(db);
    const nextAssets = new Set([input.logoImageId, input.faviconImageId, input.ogImageId]);
    const removed = oldAssetIds.filter((id) => !nextAssets.has(id));
    if (removed.length > 0) {
      await cleanupOrphanImages(removed);
    }

    res.json({ ok: true, failedFields: failedPaths, translatedChars });
  });

  // ---- ADMIN DESTINATIONS ----
  router.post('/admin/destinations', requireOwner, async (req, res) => {
    const parsed = destinationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' });
      return;
    }

    const db = getDb();
    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch([
      { path: 'name', next: parsed.data.name, prev: null, force: Boolean(req.body?.forceTranslate) },
    ]);

    const name = resolved.get('name')!;
    const baseSlug = slugifyAscii(parsed.data.slug || name.en || parsed.data.name.ar, 'dest');
    let slug = baseSlug;
    let suffix = 2;
    while (db.destinations.some((d) => d.slug === slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const dest = {
      id: crypto.randomUUID(),
      slug,
      name,
      sortOrder: db.destinations.length,
      isActive: parsed.data.isActive,
    };
    db.destinations.push(dest);
    await saveDb(db);
    res.status(201).json({ destination: dest, failedFields: failedPaths, translatedChars });
  });

  router.put('/admin/destinations/:id', requireOwner, async (req, res) => {
    const parsed = destinationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' });
      return;
    }

    const db = getDb();
    const dest = db.destinations.find((d) => d.id === req.params.id);
    if (!dest) {
      res.status(404).json({ error: 'الوجهة غير موجودة' });
      return;
    }

    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch([
      {
        path: 'name',
        next: parsed.data.name,
        prev: dest.name,
        force: Boolean(req.body?.forceTranslate),
      },
    ]);

    dest.name = resolved.get('name')!;
    dest.isActive = parsed.data.isActive;
    await saveDb(db);
    res.json({ destination: dest, failedFields: failedPaths, translatedChars });
  });

  router.patch('/admin/destinations/reorder', requireOwner, async (req, res) => {
    const schema = z.object({ orderedIds: z.array(z.string()) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'ترتيب غير صالح' });
      return;
    }
    const db = getDb();
    const orderMap = new Map(parsed.data.orderedIds.map((id, i) => [id, i]));
    db.destinations.forEach((d) => {
      if (orderMap.has(d.id)) d.sortOrder = orderMap.get(d.id)!;
    });
    await saveDb(db);
    res.json({ ok: true });
  });

  router.delete('/admin/destinations/:id', requireOwner, async (req, res) => {
    const db = getDb();
    if (db.trips.some((t) => t.destinationId === req.params.id)) {
      res.status(400).json({ error: 'لا يمكن حذف وجهة مرتبطة برحلات حالية. قم بتعطيلها أو نقل الرحلات أولاً.' });
      return;
    }
    db.destinations = db.destinations.filter((d) => d.id !== req.params.id);
    await saveDb(db);
    res.json({ ok: true });
  });

  // ---- ADMIN GALLERY ----
  router.post('/admin/gallery', requireOwner, async (req, res) => {
    const schema = z.object({ imageIds: z.array(z.string().min(1)).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'اختر صورة واحدة على الأقل' });
      return;
    }
    const db = getDb();
    const validImages = new Set(db.images.map((i) => i.id));
    let nextOrder = db.galleryImages.length;
    const created = [];
    for (const imageId of parsed.data.imageIds) {
      if (!validImages.has(imageId)) continue;
      const item = {
        id: crypto.randomUUID(),
        imageId,
        caption: { ar: '', en: '', enManual: false },
        sortOrder: nextOrder++,
        createdAt: new Date().toISOString(),
      };
      db.galleryImages.push(item);
      created.push(item);
    }
    await saveDb(db);
    res.status(201).json({ items: created });
  });

  router.put('/admin/gallery/:id', requireOwner, async (req, res) => {
    const schema = z.object({
      caption: localizedTextSchema,
      forceTranslate: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'تعليق غير صالح' });
      return;
    }
    const db = getDb();
    const item = db.galleryImages.find((g) => g.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'الصورة غير موجودة' });
      return;
    }
    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch([
      {
        path: 'caption',
        next: parsed.data.caption,
        prev: item.caption,
        force: Boolean(parsed.data.forceTranslate),
      },
    ]);
    item.caption = resolved.get('caption')!;
    await saveDb(db);
    res.json({ item, failedFields: failedPaths, translatedChars });
  });

  router.patch('/admin/gallery/reorder', requireOwner, async (req, res) => {
    const schema = z.object({ orderedIds: z.array(z.string()) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'ترتيب غير صالح' });
      return;
    }
    const db = getDb();
    const orderMap = new Map(parsed.data.orderedIds.map((id, i) => [id, i]));
    db.galleryImages.forEach((g) => {
      if (orderMap.has(g.id)) g.sortOrder = orderMap.get(g.id)!;
    });
    await saveDb(db);
    res.json({ ok: true });
  });

  router.delete('/admin/gallery/:id', requireOwner, async (req, res) => {
    const db = getDb();
    const item = db.galleryImages.find((g) => g.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'الصورة غير موجودة' });
      return;
    }
    db.galleryImages = db.galleryImages.filter((g) => g.id !== item.id);
    await saveDb(db);
    await cleanupOrphanImages([item.imageId]);
    res.json({ ok: true });
  });

  // ---- ADMIN TRIPS ----
  router.post('/admin/trips', requireOwner, async (req, res) => {
    const parsed = tripInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات الرحلة غير مكتملة' });
      return;
    }

    const db = getDb();
    const input = parsed.data;
    const forceFields = new Set<string>(Array.isArray(req.body?.forceTranslateFields) ? req.body.forceTranslateFields : []);

    const entries: Array<{ path: string; next: LocalizedText; prev?: LocalizedText | null; force?: boolean }> = [
      { path: 'title', next: input.title, prev: null, force: forceFields.has('title') },
      { path: 'tagline', next: input.tagline, prev: null, force: forceFields.has('tagline') },
      { path: 'description', next: input.description, prev: null, force: forceFields.has('description') },
    ];
    if (input.badge) {
      entries.push({ path: 'badge', next: input.badge, prev: null, force: forceFields.has('badge') });
    }
    const cleanFeatures = input.features.filter((f) => f.ar.trim().length > 0);
    cleanFeatures.forEach((f, idx) => {
      entries.push({ path: `features.${idx}`, next: f, prev: null, force: forceFields.has(`features.${idx}`) });
    });
    input.itinerary.forEach((d, idx) => {
      entries.push(
        { path: `itinerary.${idx}.title`, next: d.title, prev: null, force: forceFields.has(`itinerary.${idx}.title`) },
        { path: `itinerary.${idx}.description`, next: d.description, prev: null, force: forceFields.has(`itinerary.${idx}.description`) }
      );
    });
    input.optionalActivities.forEach((a, idx) => {
      entries.push(
        { path: `activities.${idx}.title`, next: a.title, prev: null, force: forceFields.has(`activities.${idx}.title`) },
        { path: `activities.${idx}.description`, next: a.description, prev: null, force: forceFields.has(`activities.${idx}.description`) }
      );
    });

    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch(entries);
    const title = resolved.get('title')!;
    const baseSlug = slugifyAscii(title.en || '', 'trip');
    let slug = baseSlug;
    let suffix = 2;
    while (db.trips.some((t) => t.slug === slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const tripId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.trips.push({
      id: tripId,
      slug,
      title,
      destinationId: input.destinationId,
      tagline: resolved.get('tagline')!,
      badge: input.badge && input.badge.ar.trim() ? resolved.get('badge')! : null,
      features: cleanFeatures.map((_, idx) => resolved.get(`features.${idx}`)!),
      description: resolved.get('description')!,
      durationDays: input.durationDays ?? null,
      priceAmount: input.priceAmount ?? null,
      pricePrefix: input.pricePrefix,
      priceUnit: input.priceUnit,
      status: input.status,
      sortOrder: db.trips.length,
      createdAt: now,
      updatedAt: now,
    });

    const validImageIds = new Set(db.images.map((i) => i.id));
    input.imageIds
      .filter((id) => validImageIds.has(id))
      .forEach((imageId, idx) => {
        db.tripImages.push({
          id: crypto.randomUUID(),
          tripId,
          imageId,
          sortOrder: idx,
        });
      });

    input.itinerary.forEach((_, idx) => {
      db.itineraryDays.push({
        id: crypto.randomUUID(),
        tripId,
        sortOrder: idx,
        title: resolved.get(`itinerary.${idx}.title`)!,
        description: resolved.get(`itinerary.${idx}.description`)!,
      });
    });

    input.optionalActivities.forEach((act, idx) => {
      db.optionalActivities.push({
        id: crypto.randomUUID(),
        tripId,
        sortOrder: idx,
        title: resolved.get(`activities.${idx}.title`)!,
        description: resolved.get(`activities.${idx}.description`)!,
        pricing: act.pricing,
        priceAmount: act.pricing === 'EXTRA_COST' ? act.priceAmount ?? null : null,
      });
    });

    await saveDb(db);
    const created = hydrateTrips(db, true).find((t) => t.id === tripId);
    res.status(201).json({ trip: created, failedFields: failedPaths, translatedChars });
  });

  router.put('/admin/trips/:id', requireOwner, async (req, res) => {
    const parsed = tripInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات الرحلة غير مكتملة' });
      return;
    }

    const db = getDb();
    const existing = db.trips.find((t) => t.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'الرحلة غير موجودة' });
      return;
    }

    const input = parsed.data;
    const forceFields = new Set<string>(Array.isArray(req.body?.forceTranslateFields) ? req.body.forceTranslateFields : []);
    const prevItinerary = db.itineraryDays
      .filter((d) => d.tripId === existing.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const prevActivities = db.optionalActivities
      .filter((a) => a.tripId === existing.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const entries: Array<{ path: string; next: LocalizedText; prev?: LocalizedText | null; force?: boolean }> = [
      { path: 'title', next: input.title, prev: existing.title, force: forceFields.has('title') },
      { path: 'tagline', next: input.tagline, prev: existing.tagline, force: forceFields.has('tagline') },
      { path: 'description', next: input.description, prev: existing.description, force: forceFields.has('description') },
    ];
    if (input.badge) {
      entries.push({ path: 'badge', next: input.badge, prev: existing.badge, force: forceFields.has('badge') });
    }
    const cleanFeatures = input.features.filter((f) => f.ar.trim().length > 0);
    cleanFeatures.forEach((f, idx) => {
      entries.push({
        path: `features.${idx}`,
        next: f,
        prev: existing.features[idx],
        force: forceFields.has(`features.${idx}`),
      });
    });
    input.itinerary.forEach((d, idx) => {
      const prevDay = prevItinerary.find((p) => p.id === d.id) || prevItinerary[idx];
      entries.push(
        { path: `itinerary.${idx}.title`, next: d.title, prev: prevDay?.title, force: forceFields.has(`itinerary.${idx}.title`) },
        { path: `itinerary.${idx}.description`, next: d.description, prev: prevDay?.description, force: forceFields.has(`itinerary.${idx}.description`) }
      );
    });
    input.optionalActivities.forEach((a, idx) => {
      const prevAct = prevActivities.find((p) => p.id === a.id) || prevActivities[idx];
      entries.push(
        { path: `activities.${idx}.title`, next: a.title, prev: prevAct?.title, force: forceFields.has(`activities.${idx}.title`) },
        { path: `activities.${idx}.description`, next: a.description, prev: prevAct?.description, force: forceFields.has(`activities.${idx}.description`) }
      );
    });

    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch(entries);

    const oldImageIds = db.tripImages
      .filter((ti) => ti.tripId === existing.id)
      .map((ti) => ti.imageId);

    // Slug never changes once set!
    existing.title = resolved.get('title')!;
    existing.destinationId = input.destinationId;
    existing.tagline = resolved.get('tagline')!;
    existing.badge = input.badge && input.badge.ar.trim() ? resolved.get('badge')! : null;
    existing.features = cleanFeatures.map((_, idx) => resolved.get(`features.${idx}`)!);
    existing.description = resolved.get('description')!;
    existing.durationDays = input.durationDays ?? null;
    existing.priceAmount = input.priceAmount ?? null;
    existing.pricePrefix = input.pricePrefix;
    existing.priceUnit = input.priceUnit;
    existing.status = input.status;
    existing.updatedAt = new Date().toISOString();

    const validImageIds = new Set(db.images.map((i) => i.id));
    db.tripImages = db.tripImages.filter((ti) => ti.tripId !== existing.id);
    input.imageIds
      .filter((id) => validImageIds.has(id))
      .forEach((imageId, idx) => {
        db.tripImages.push({
          id: crypto.randomUUID(),
          tripId: existing.id,
          imageId,
          sortOrder: idx,
        });
      });

    db.itineraryDays = db.itineraryDays.filter((d) => d.tripId !== existing.id);
    input.itinerary.forEach((_, idx) => {
      db.itineraryDays.push({
        id: crypto.randomUUID(),
        tripId: existing.id,
        sortOrder: idx,
        title: resolved.get(`itinerary.${idx}.title`)!,
        description: resolved.get(`itinerary.${idx}.description`)!,
      });
    });

    db.optionalActivities = db.optionalActivities.filter((a) => a.tripId !== existing.id);
    input.optionalActivities.forEach((act, idx) => {
      db.optionalActivities.push({
        id: crypto.randomUUID(),
        tripId: existing.id,
        sortOrder: idx,
        title: resolved.get(`activities.${idx}.title`)!,
        description: resolved.get(`activities.${idx}.description`)!,
        pricing: act.pricing,
        priceAmount: act.pricing === 'EXTRA_COST' ? act.priceAmount ?? null : null,
      });
    });

    await saveDb(db);
    const removed = oldImageIds.filter((id) => !input.imageIds.includes(id));
    if (removed.length > 0) {
      await cleanupOrphanImages(removed);
    }

    const updated = hydrateTrips(db, true).find((t) => t.id === existing.id);
    res.json({ trip: updated, failedFields: failedPaths, translatedChars });
  });

  router.patch('/admin/trips/reorder', requireOwner, async (req, res) => {
    const schema = z.object({ orderedIds: z.array(z.string()) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'ترتيب غير صالح' });
      return;
    }
    const db = getDb();
    const orderMap = new Map(parsed.data.orderedIds.map((id, i) => [id, i]));
    db.trips.forEach((t) => {
      if (orderMap.has(t.id)) t.sortOrder = orderMap.get(t.id)!;
    });
    await saveDb(db);
    res.json({ ok: true });
  });

  router.patch('/admin/trips/:id/status', requireOwner, async (req, res) => {
    const schema = z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'حالة غير صالحة' });
      return;
    }
    const db = getDb();
    const trip = db.trips.find((t) => t.id === req.params.id);
    if (!trip) {
      res.status(404).json({ error: 'الرحلة غير موجودة' });
      return;
    }

    if (parsed.data.status === 'PUBLISHED') {
      const tripImgs = db.tripImages.filter((ti) => ti.tripId === trip.id);
      const validFeatures = trip.features.filter((f) => f.ar.trim().length > 0);
      if (
        !trip.title.ar.trim() ||
        !trip.destinationId ||
        !trip.tagline.ar.trim() ||
        tripImgs.length < 1 ||
        validFeatures.length < 2 ||
        validFeatures.length > 4
      ) {
        res.status(400).json({
          error:
            'لا يمكن نشر الرحلة قبل استيفاء: العنوان، الوجهة، الوصف المختصر، صورة واحدة على الأقل، ومن 2 إلى 4 مميزات.',
        });
        return;
      }
    }

    trip.status = parsed.data.status;
    trip.updatedAt = new Date().toISOString();
    await saveDb(db);
    res.json({ ok: true, status: trip.status });
  });

  router.delete('/admin/trips/:id', requireOwner, async (req, res) => {
    const db = getDb();
    const trip = db.trips.find((t) => t.id === req.params.id);
    if (!trip) {
      res.status(404).json({ error: 'الرحلة غير موجودة' });
      return;
    }
    const imageIds = db.tripImages
      .filter((ti) => ti.tripId === trip.id)
      .map((ti) => ti.imageId);

    db.trips = db.trips.filter((t) => t.id !== trip.id);
    db.tripImages = db.tripImages.filter((ti) => ti.tripId !== trip.id);
    db.itineraryDays = db.itineraryDays.filter((d) => d.tripId !== trip.id);
    db.optionalActivities = db.optionalActivities.filter((a) => a.tripId !== trip.id);
    await saveDb(db);

    if (imageIds.length > 0) {
      await cleanupOrphanImages(imageIds);
    }
    res.json({ ok: true });
  });

  return router;
}

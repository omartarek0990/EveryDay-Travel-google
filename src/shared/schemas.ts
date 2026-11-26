import { z } from 'zod';

export const localizedTextSchema = z.object({
  ar: z.string().trim(),
  en: z.string().trim(),
  enManual: z.boolean().default(false),
});

export const optionalLocalizedTextSchema = z
  .object({
    ar: z.string().trim(),
    en: z.string().trim(),
    enManual: z.boolean().default(false),
  })
  .nullable()
  .optional();

export const httpsUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'يجب أن يبدأ الرابط بـ https://' }
  );

export function normalizeEgyptianWhatsapp(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (/^01[0125]\d{8}$/.test(digits)) {
    return `2${digits}`;
  }
  if (/^201[0125]\d{8}$/.test(digits)) {
    return digits;
  }
  return '';
}

export function formatLocalEgyptianPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (/^201[0125]\d{8}$/.test(digits)) {
    return digits.slice(1);
  }
  return digits;
}

export const egyptianPhoneInputSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      return normalizeEgyptianWhatsapp(val) !== '';
    },
    { message: 'أدخل رقم هاتف مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015 (11 رقماً)' }
  );

export const COMMON_PASSWORDS = new Set([
  '1234567890',
  '0123456789',
  'password123',
  'password1234',
  'admin12345',
  'admin123456',
  'qwerty1234',
  'qwertyuiop',
  'everyday123',
  'everyday2026',
  'letmein123',
  'welcome123',
]);

export function validatePasswordStrength(password: string, username?: string): string | null {
  if (password.length < 10) {
    return 'كلمة المرور يجب أن تكون 10 أحرف على الأقل';
  }
  const lower = password.toLowerCase();
  if (username && lower.includes(username.toLowerCase()) && username.trim().length >= 3) {
    return 'لا يمكن أن تحتوي كلمة المرور على اسم المستخدم';
  }
  if (COMMON_PASSWORDS.has(lower)) {
    return 'كلمة المرور شائعة جداً، اختر كلمة مرور أقوى';
  }
  return null;
}

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'اسم المستخدم مطلوب').max(64),
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(128),
});

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
  .max(32, 'اسم المستخدم طويل جداً')
  .regex(/^[a-z0-9._-]+$/, 'اسم المستخدم يقبل أحرف إنجليزية وأرقام فقط');

export const setupOwnerSchema = z.object({
  username: usernameSchema,
  password: z.string().min(10, 'كلمة المرور يجب أن تكون 10 أحرف على الأقل').max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة').max(128),
  newPassword: z.string().min(10, 'كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل').max(128),
});

export const updateAccountSchema = z
  .object({
    currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة').max(128),
    username: usernameSchema.optional(),
    newPassword: z.string().max(128).optional(),
  })
  .refine(
    (data) => Boolean(data.username) || Boolean(data.newPassword && data.newPassword.length > 0),
    { message: 'أدخل اسم مستخدم جديد أو كلمة مرور جديدة' }
  );

export const resetAccountSchema = z.object({
  recoveryCode: z.string().trim().min(1, 'رمز الاسترداد مطلوب').max(256),
  username: usernameSchema,
  newPassword: z.string().min(10, 'كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل').max(128),
});

export const whyUsItemSchema = z.object({
  id: z.string().min(1),
  title: localizedTextSchema,
  body: localizedTextSchema,
});

export const updateHomeSettingsSchema = z.object({
  heroBadge: localizedTextSchema,
  heroTitle: localizedTextSchema,
  heroSubtitle: localizedTextSchema,
  heroDescription: localizedTextSchema,
  heroFeatures: z.array(localizedTextSchema).length(3),
  heroIntervalSeconds: z.number().int().min(3).max(15),
  showTripsSection: z.boolean(),
  showWhyUsSection: z.boolean(),
  showGallerySection: z.boolean(),
  showContactSection: z.boolean(),
  whyUsItems: z.array(whyUsItemSchema).max(4),
  heroImageIds: z.array(z.string().min(1)),
});

export const updateSiteSettingsSchema = z.object({
  companyName: localizedTextSchema,
  logoImageId: z.string().nullable(),
  faviconImageId: z.string().nullable(),
  phone: egyptianPhoneInputSchema,
  whatsapp: egyptianPhoneInputSchema,
  email: z
    .string()
    .trim()
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: 'البريد الإلكتروني غير صحيح',
    }),
  address: localizedTextSchema,
  mapUrl: httpsUrlSchema,
  tiktokUrl: httpsUrlSchema,
  facebookUrl: httpsUrlSchema,
  instagramUrl: httpsUrlSchema,
  whatsappMessage: localizedTextSchema,
  seoTitle: localizedTextSchema,
  seoDescription: localizedTextSchema,
  ogImageId: z.string().nullable(),
  aboutTitle: localizedTextSchema,
  aboutBody: localizedTextSchema,
  tripsIntro: localizedTextSchema,
  galleryTitle: localizedTextSchema,
  contactIntro: localizedTextSchema,
  footerTagline: localizedTextSchema,
});

export const destinationInputSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'الرابط يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات فقط')
    .optional(),
  name: localizedTextSchema.refine((v) => v.ar.length > 0, {
    message: 'اسم الوجهة بالعربية مطلوب',
  }),
  isActive: z.boolean().default(true),
});

export const itineraryDayInputSchema = z.object({
  id: z.string().optional(),
  title: localizedTextSchema.refine((v) => v.ar.length > 0, {
    message: 'عنوان اليوم مطلوب',
  }),
  description: localizedTextSchema,
});

export const optionalActivityInputSchema = z.object({
  id: z.string().optional(),
  title: localizedTextSchema.refine((v) => v.ar.length > 0, {
    message: 'اسم النشاط مطلوب',
  }),
  description: localizedTextSchema,
  pricing: z.enum(['FREE', 'EXTRA_COST']),
  priceAmount: z.number().int().positive().nullable().optional(),
});

export const tripInputSchema = z
  .object({
    title: localizedTextSchema.refine((v) => v.ar.length > 0, {
      message: 'عنوان الرحلة بالعربية مطلوب',
    }),
    destinationId: z.string().min(1, 'اختر الوجهة'),
    tagline: localizedTextSchema,
    badge: optionalLocalizedTextSchema,
    features: z.array(localizedTextSchema).min(0).max(4),
    description: localizedTextSchema,
    durationDays: z.number().int().positive().max(90).nullable().optional(),
    priceAmount: z.number().int().nonnegative().nullable().optional(),
    pricePrefix: z.enum(['NONE', 'STARTING_FROM']),
    priceUnit: z.enum(['PER_PERSON', 'PER_TRIP', 'NONE']),
    status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']),
    imageIds: z.array(z.string().min(1)),
    itinerary: z.array(itineraryDayInputSchema),
    optionalActivities: z.array(optionalActivityInputSchema),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'PUBLISHED') {
      if (!data.title.ar.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['title', 'ar'],
          message: 'العنوان مطلوب للنشر',
        });
      }
      if (!data.destinationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['destinationId'],
          message: 'الوجهة مطلوبة للنشر',
        });
      }
      if (!data.tagline.ar.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tagline', 'ar'],
          message: 'الوصف المختصر مطلوب للنشر',
        });
      }
      if (data.imageIds.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['imageIds'],
          message: 'يجب إضافة صورة واحدة على الأقل قبل النشر',
        });
      }
      const validFeatures = data.features.filter((f) => f.ar.trim().length > 0);
      if (validFeatures.length < 2 || validFeatures.length > 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['features'],
          message: 'يجب إضافة من 2 إلى 4 مميزات قبل النشر',
        });
      }
    }
  });

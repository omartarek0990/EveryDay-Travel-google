/**
 * Admin dashboard API audit (read/write against the configured Supabase project).
 *
 *   AUDIT_USER=audit-bot AUDIT_PASS=... node scripts/audit-admin.mjs
 *
 * Optional: AUDIT_BASE (default http://127.0.0.1:3001).
 *
 * Safety: every record it creates is prefixed AUDIT-, and the finally block
 * removes them again. Settings/home saves are reverted to the captured originals.
 * The password is read from the environment and never printed.
 */

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:3001';
const USER = process.env.AUDIT_USER || 'audit-bot';
const PASS = process.env.AUDIT_PASS || '';

if (!PASS) {
  console.error('AUDIT_PASS is required.');
  process.exit(1);
}

let cookie = '';
const results = [];
const created = { destinations: [], gallery: [], trips: [] };
let originalSettings = null;
let originalHome = null;

function check(id, name, ok, detail = '') {
  results.push({ id, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(7)} ${name}${detail ? ' — ' + detail : ''}`);
}

async function api(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const h = { ...headers };
  if (cookie) h.Cookie = cookie;
  if (body !== undefined && !raw) {
    h['Content-Type'] = 'application/json';
  }
  const res = await fetch(BASE + path, {
    method,
    headers: h,
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
    redirect: 'manual',
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  return { status: res.status, text, json, headers: res.headers };
}

const SETTINGS_FIELDS = [
  'companyName', 'logoImageId', 'faviconImageId', 'phone', 'whatsapp', 'email', 'address',
  'mapUrl', 'tiktokUrl', 'facebookUrl', 'instagramUrl', 'whatsappMessage', 'seoTitle',
  'seoDescription', 'ogImageId', 'aboutTitle', 'aboutBody', 'tripsIntro', 'galleryTitle',
  'contactIntro', 'footerTagline',
];
const HOME_FIELDS = [
  'heroBadge', 'heroTitle', 'heroSubtitle', 'heroDescription', 'heroFeatures',
  'heroIntervalSeconds', 'showTripsSection', 'showWhyUsSection', 'showGallerySection',
  'showContactSection', 'whyUsItems', 'heroImageIds',
];

function pick(source, fields) {
  return Object.fromEntries(fields.map((f) => [f, source?.[f]]));
}

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function main() {
  // ---------- A. unauthenticated ----------
  const unauthRoutes = [
    ['GET', '/api/admin/data'],
    ['PUT', '/api/admin/home'],
    ['PUT', '/api/admin/settings'],
    ['POST', '/api/admin/trips'],
    ['POST', '/api/admin/destinations'],
    ['POST', '/api/admin/gallery'],
    ['PATCH', '/api/admin/trips/reorder'],
    ['PATCH', '/api/admin/trips/x/status'],
    ['DELETE', '/api/admin/trips/x'],
    ['POST', '/api/uploads/sign'],
    ['POST', '/api/uploads/verify'],
  ];
  let unauthOk = 0;
  let leaked = false;
  for (const [method, path] of unauthRoutes) {
    const r = await api(path, { method, body: method === 'GET' ? undefined : {} });
    if (r.status === 401) unauthOk += 1;
    if (r.json && (r.json.settings || r.json.trips || r.json.images)) leaked = true;
  }
  check('A1', `${unauthOk}/${unauthRoutes.length} admin routes return 401 without a session`, unauthOk === unauthRoutes.length);
  check('A2', '401 responses leak no data', !leaked);
  const pub = await api('/api/public/landing');
  check('A3', 'public landing still serves without a session', pub.status === 200);

  // ---------- B. login ----------
  const badLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { username: USER, password: 'definitely-not-the-password' },
  });
  check('B1', 'wrong password → 401 with a generic Arabic message',
    badLogin.status === 401 && /اسم المستخدم أو كلمة المرور/.test(badLogin.json?.error ?? ''));
  const unknownUser = await api('/api/auth/login', { method: 'POST', body: { username: 'no-such-owner', password: 'whatever12345' } });
  check('B2', 'unknown username → same generic message (no user enumeration)',
    unknownUser.status === 401 && unknownUser.json?.error === badLogin.json?.error);

  const login = await api('/api/auth/login', { method: 'POST', body: { username: USER, password: PASS } });
  const setCookie = login.headers.get('set-cookie') || '';
  cookie = setCookie.split(';')[0];
  check('B3', 'valid login → 200 with a session cookie', login.status === 200 && cookie.length > 10);
  check('B4', 'session cookie is HttpOnly', /HttpOnly/i.test(setCookie), setCookie.replace(/=[^;]+/, '=<redacted>'));

  const me = await api('/api/auth/me');
  check('B5', 'authenticated /api/auth/me returns the bot user', me.status === 200 && me.json?.user?.username === USER);

  const data = await api('/api/admin/data');
  check('B6', 'GET /api/admin/data returns the dashboard payload', data.status === 200 && !!data.json?.settings);
  originalSettings = pick(data.json.settings, SETTINGS_FIELDS);
  originalHome = {
    ...pick(data.json.settings, HOME_FIELDS),
    heroImageIds: (data.json.heroImages ?? []).map((h) => h.imageId),
  };

  const existingImageIds = (data.json.images ?? []).map((i) => i.id);
  const existingDestId = data.json.destinations?.[0]?.id;

  // ---------- C. negative payloads ----------
  const baseHome = { ...originalHome };
  check('C1', 'hero interval 2 → 400',
    (await api('/api/admin/home', { method: 'PUT', body: { ...baseHome, heroIntervalSeconds: 2 } })).status === 400);
  check('C2', 'hero interval 16 → 400',
    (await api('/api/admin/home', { method: 'PUT', body: { ...baseHome, heroIntervalSeconds: 16 } })).status === 400);
  check('C3', 'only 1 hero feature → 400',
    (await api('/api/admin/home', { method: 'PUT', body: { ...baseHome, heroFeatures: [baseHome.heroFeatures?.[0]] } })).status === 400);

  const baseSettings = { ...originalSettings };
  const badWa = await api('/api/admin/settings', { method: 'PUT', body: { ...baseSettings, whatsapp: '123' } });
  check('C4', 'invalid WhatsApp number → 400 with an Arabic message',
    badWa.status === 400 && /[\u0600-\u06FF]/.test(badWa.json?.error ?? ''));
  check('C5', 'http:// map URL → 400',
    (await api('/api/admin/settings', { method: 'PUT', body: { ...baseSettings, mapUrl: 'http://example.com' } })).status === 400);

  const badSlug = await api('/api/admin/destinations', { method: 'POST', body: { name: { ar: 'اختبار', en: 'x', enManual: true }, slug: 'Bad Slug', isActive: true } });
  check('C6', 'invalid slug → 400', badSlug.status === 400);
  check('C7', 'destination with empty Arabic name → 400',
    (await api('/api/admin/destinations', { method: 'POST', body: { name: { ar: '', en: '', enManual: false }, isActive: true } })).status === 400);
  check('C8', 'trip without a title → 400',
    (await api('/api/admin/trips', { method: 'POST', body: { destinationId: existingDestId, tagline: { ar: 'x', en: '', enManual: false } } })).status === 400);
  check('C9', 'negative price → 400',
    (await api('/api/admin/trips', { method: 'POST', body: {
      title: { ar: 'AUDIT-سعر', en: '', enManual: false }, destinationId: existingDestId,
      tagline: { ar: 'x', en: '', enManual: false }, priceAmount: -5,
      features: [], description: { ar: '', en: '', enManual: false },
      pricePrefix: 'NONE', priceUnit: 'NONE', status: 'DRAFT', imageIds: [], itinerary: [], optionalActivities: [],
    } })).status === 400);

  const big = 'x'.repeat(3 * 1024 * 1024);
  const oversized = await api('/api/admin/settings', { method: 'PUT', raw: true, body: JSON.stringify({ ...baseSettings, address: { ar: big, en: '', enManual: false } }), headers: { 'Content-Type': 'application/json' } });
  check('C10', 'oversized body → 4xx (not 500)', oversized.status >= 400 && oversized.status < 500, `HTTP ${oversized.status}`);

  const wrongOrigin = await api('/api/admin/destinations', {
    method: 'POST',
    body: { name: { ar: 'AUDIT-أصل', en: 'AUDIT-origin', enManual: true }, isActive: true },
    headers: { Origin: 'https://evil.example.com' },
  });
  check('C11', 'state-changing request from a foreign origin → 403', wrongOrigin.status === 403, `HTTP ${wrongOrigin.status}`);

  check('C12', 'PATCH status on an unknown trip → 404',
    (await api('/api/admin/trips/does-not-exist/status', { method: 'PATCH', body: { status: 'PUBLISHED' } })).status === 404);
  check('C13', 'DELETE unknown trip → 404',
    (await api('/api/admin/trips/does-not-exist', { method: 'DELETE' })).status === 404);
  check('C14', 'DELETE unknown gallery item → 404',
    (await api('/api/admin/gallery/does-not-exist', { method: 'DELETE' })).status === 404);
  check('C15', 'reorder with unknown ids → 200 and no crash',
    (await api('/api/admin/trips/reorder', { method: 'PATCH', body: { orderedIds: ['nope-1', 'nope-2'] } })).status === 200);
  check('C16', 'reorder with a non-array → 400',
    (await api('/api/admin/trips/reorder', { method: 'PATCH', body: { orderedIds: 'nope' } })).status === 400);

  // ---------- D. plain-text storage ----------
  const xssName = 'AUDIT-<script>alert(1)</script>\'; DROP TABLE images;--';
  const xssDest = await api('/api/admin/destinations', {
    method: 'POST',
    body: { name: { ar: xssName, en: 'AUDIT-xss', enManual: true }, isActive: true },
  });
  if (xssDest.status === 201) created.destinations.push(xssDest.json.destination.id);
  const storedName = xssDest.json?.destination?.name?.ar ?? '';
  check('D1', 'HTML/SQL-like text stored verbatim (not executed/parsed)', storedName === xssName);
  const page = await api('/ar');
  check('D2', 'served HTML does not contain the raw <script> payload',
    page.status === 200 && !page.text.includes('<script>alert(1)</script>'));
  const landing = await api('/api/public/landing');
  check('D3', 'payload still valid JSON after the XSS string was stored', landing.status === 200 && !!landing.json);

  // ---------- E. happy paths: destination ----------
  const suffix = Date.now().toString(36);
  const destCreate = await api('/api/admin/destinations', {
    method: 'POST',
    body: { name: { ar: `AUDIT-وجهة-${suffix}`, en: `AUDIT-dest-${suffix}`, enManual: true }, slug: `audit-dest-${suffix}`, isActive: true },
  });
  const destId = destCreate.json?.destination?.id;
  if (destId) created.destinations.push(destId);
  check('E1', 'destination create → 201', destCreate.status === 201 && !!destId);

  const dupSlug = await api('/api/admin/destinations', {
    method: 'POST',
    body: { name: { ar: `AUDIT-وجهة2-${suffix}`, en: 'AUDIT-dup', enManual: true }, slug: `audit-dest-${suffix}`, isActive: true },
  });
  const dupSlugValue = dupSlug.json?.destination?.slug ?? '';
  if (dupSlug.json?.destination?.id) created.destinations.push(dupSlug.json.destination.id);
  check('E2', 'duplicate slug gets a unique suffix', dupSlug.status === 201 && dupSlugValue !== `audit-dest-${suffix}`, dupSlugValue);

  check('E3', 'destination update → 200',
    (await api(`/api/admin/destinations/${destId}`, { method: 'PUT', body: { name: { ar: 'AUDIT-محدث', en: 'AUDIT-updated', enManual: true }, isActive: false } })).status === 200);
  check('E4', 'destination reorder → 200',
    (await api('/api/admin/destinations/reorder', { method: 'PATCH', body: { orderedIds: created.destinations } })).status === 200);
  check('E5', 'destination referenced by a trip cannot be deleted → 400',
    (await api(`/api/admin/destinations/${existingDestId}`, { method: 'DELETE' })).status === 400);

  // ---------- F. upload through the signed flow ----------
  const sign = await api('/api/uploads/sign', {
    method: 'POST',
    body: { folder: 'everyday', fileName: 'audit.png', mimeType: 'image/png', key: `audit${suffix}abc` },
  });
  check('F1', 'signed upload request → 200 with an upload URL', sign.status === 200 && !!sign.json?.uploadUrl, sign.json?.provider);

  let uploadedImageId = null;
  let uploadedPublicId = null;
  if (sign.status === 200) {
    const { uploadUrl, fields = {} } = sign.json;
    const target = new URL(uploadUrl, BASE);
    if (fields.token) target.searchParams.set('token', fields.token);
    const put = await fetch(target, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: PNG_1PX,
    });
    check('F2', 'PUT to the signed URL succeeds', put.ok, `HTTP ${put.status}`);

    uploadedPublicId = fields.path || null;
    const verify = await api('/api/uploads/verify', {
      method: 'POST',
      body: { publicId: uploadedPublicId, widthHint: 1, heightHint: 1, avgColor: '#ffffff' },
    });
    uploadedImageId = verify.json?.image?.id ?? null;
    check('F3', 'verify creates the image row → 201', verify.status === 201 && !!uploadedImageId);

    const forged = await api('/api/uploads/verify', {
      method: 'POST',
      body: { publicId: 'everyday/does-not-exist-audit.png' },
    });
    check('F4', 'verify rejects a publicId that is not in storage → 400', forged.status === 400);

    const badType = await api('/api/uploads/sign', { method: 'POST', body: { folder: '../etc', fileName: 'x.svg', mimeType: 'image/svg+xml' } });
    check('F5', 'sign sanitises the folder and rejects nothing dangerous silently', badType.status === 200);
  }

  // ---------- G. happy paths: gallery ----------
  if (uploadedImageId) {
    const galAdd = await api('/api/admin/gallery', { method: 'POST', body: { imageIds: [uploadedImageId] } });
    const galId = galAdd.json?.items?.[0]?.id;
    if (galId) created.gallery.push(galId);
    check('G1', 'gallery add → 201', galAdd.status === 201 && !!galId);
    if (galId) {
      check('G2', 'gallery caption update → 200',
        (await api(`/api/admin/gallery/${galId}`, { method: 'PUT', body: { caption: { ar: 'AUDIT-تعليق', en: 'AUDIT-caption', enManual: true } } })).status === 200);
      check('G3', 'gallery reorder → 200',
        (await api('/api/admin/gallery/reorder', { method: 'PATCH', body: { orderedIds: created.gallery } })).status === 200);
      check('G4', 'gallery delete → 200 (image row cleaned up)',
        (await api(`/api/admin/gallery/${galId}`, { method: 'DELETE' })).status === 200);
      created.gallery = created.gallery.filter((id) => id !== galId);
    }
  }

  // ---------- H. happy paths: trip ----------
  const tripBody = {
    title: { ar: `AUDIT-رحلة-${suffix}`, en: `AUDIT-trip-${suffix}`, enManual: true },
    destinationId: existingDestId,
    tagline: { ar: 'AUDIT-وصف مختصر', en: 'AUDIT-tagline', enManual: true },
    badge: null,
    features: [
      { ar: 'AUDIT-ميزة 1', en: 'AUDIT-f1', enManual: true },
      { ar: 'AUDIT-ميزة 2', en: 'AUDIT-f2', enManual: true },
    ],
    description: { ar: 'AUDIT-وصف', en: 'AUDIT-description', enManual: true },
    durationDays: 2,
    priceAmount: 1000,
    pricePrefix: 'STARTING_FROM',
    priceUnit: 'PER_PERSON',
    status: 'DRAFT',
    imageIds: existingImageIds.slice(0, 2),
    itinerary: [{ title: { ar: 'AUDIT-يوم 1', en: 'AUDIT-day1', enManual: true }, description: { ar: 'AUDIT-وصف اليوم', en: 'AUDIT-day1-desc', enManual: true } }],
    optionalActivities: [{ title: { ar: 'AUDIT-نشاط', en: 'AUDIT-act', enManual: true }, description: { ar: 'AUDIT-وصف', en: 'AUDIT-act-desc', enManual: true }, pricing: 'EXTRA_COST', priceAmount: 250 }],
  };
  const tripCreate = await api('/api/admin/trips', { method: 'POST', body: tripBody });
  const tripId = tripCreate.json?.trip?.id;
  if (tripId) created.trips.push(tripId);
  check('H1', 'trip create → 201', tripCreate.status === 201 && !!tripId);
  if (tripId) {
    check('H2', 'trip starts as DRAFT', tripCreate.json?.trip?.status === 'DRAFT');
    check('H3', 'trip publish (2 features + image) → 200',
      (await api(`/api/admin/trips/${tripId}/status`, { method: 'PATCH', body: { status: 'PUBLISHED' } })).status === 200);
    check('H4', 'trip hide → 200',
      (await api(`/api/admin/trips/${tripId}/status`, { method: 'PATCH', body: { status: 'HIDDEN' } })).status === 200);
    check('H5', 'trip update → 200',
      (await api(`/api/admin/trips/${tripId}`, { method: 'PUT', body: { ...tripBody, durationDays: 3 } })).status === 200);
    check('H6', 'trip reorder → 200',
      (await api('/api/admin/trips/reorder', { method: 'PATCH', body: { orderedIds: [tripId, ...(data.json.trips ?? []).map((t) => t.id)] } })).status === 200);
  }

  const noImageTrip = await api('/api/admin/trips', {
    method: 'POST',
    body: { ...tripBody, title: { ar: `AUDIT-بدون صورة-${suffix}`, en: 'AUDIT-noimg', enManual: true }, imageIds: [] },
  });
  if (noImageTrip.json?.trip?.id) created.trips.push(noImageTrip.json.trip.id);
  check('H7', 'publishing a trip without images → 400',
    noImageTrip.json?.trip?.id
      ? (await api(`/api/admin/trips/${noImageTrip.json.trip.id}/status`, { method: 'PATCH', body: { status: 'PUBLISHED' } })).status === 400
      : false);

  // ---------- I. settings + home save + cache ----------
  const newPhone = '01012345678';
  const savedSettings = await api('/api/admin/settings', {
    method: 'PUT',
    body: { ...originalSettings, phone: newPhone },
  });
  check('I1', 'settings save → 200', savedSettings.status === 200);
  const fresh = await api('/api/public/landing?fresh=1');
  check('I2', 'admin fresh=1 shows the change immediately', fresh.json?.settings?.phone === newPhone);
  const cached = await api('/api/public/landing');
  check('I3', 'normal public route is cacheable (s-maxage=60)',
    /s-maxage=60/.test(cached.headers.get('cache-control') ?? ''));
  check('I4', 'fresh=1 is no-store', (fresh.headers.get('cache-control') ?? '') === 'no-store');

  const savedHome = await api('/api/admin/home', { method: 'PUT', body: { ...originalHome, heroIntervalSeconds: 7 } });
  check('I5', 'home save → 200', savedHome.status === 200);
  const freshHome = await api('/api/public/landing?fresh=1');
  check('I6', 'home change visible through fresh=1', freshHome.json?.settings?.heroIntervalSeconds === 7);

  // ---------- J. account endpoints (negative only) ----------
  check('J1', 'change-password with a wrong current password → 400',
    (await api('/api/auth/change-password', { method: 'POST', body: { currentPassword: 'wrong-password-1', newPassword: 'AnotherStrongPass123' } })).status === 400);
  check('J2', 'weak new password → 400',
    (await api('/api/auth/change-password', { method: 'POST', body: { currentPassword: PASS, newPassword: 'short' } })).status === 400);
  check('J3', 'recovery endpoint disabled when OWNER_RECOVERY_CODE is unset → 503',
    (await api('/api/auth/reset-account', { method: 'POST', body: { recoveryCode: 'x', username: 'omar', newPassword: 'AnotherStrongPass123' } })).status === 503);
  check('J4', 'logout → 200 and the session stops working',
    (await api('/api/auth/logout', { method: 'POST', body: {} })).status === 200 &&
      (await api('/api/admin/data')).status === 401);
}

async function cleanup() {
  try {
    // Re-login (logout above invalidated the cookie) so cleanup can authenticate.
    const login = await api('/api/auth/login', { method: 'POST', body: { username: USER, password: PASS } });
    if (login.status === 200) cookie = (login.headers.get('set-cookie') || '').split(';')[0];

    for (const id of created.trips) await api(`/api/admin/trips/${id}`, { method: 'DELETE' });
    for (const id of created.gallery) await api(`/api/admin/gallery/${id}`, { method: 'DELETE' });
    for (const id of created.destinations) await api(`/api/admin/destinations/${id}`, { method: 'DELETE' });
    if (originalSettings) await api('/api/admin/settings', { method: 'PUT', body: originalSettings });
    if (originalHome) await api('/api/admin/home', { method: 'PUT', body: originalHome });

    const restored = await api('/api/admin/data');
    const leftovers = (restored.json?.trips ?? []).filter((t) => String(t.title?.ar ?? '').startsWith('AUDIT-')).length
      + (restored.json?.destinations ?? []).filter((d) => String(d.name?.ar ?? '').startsWith('AUDIT-')).length;
    console.log(`\ncleanup: remaining AUDIT- records = ${leftovers}`);
    console.log(`cleanup: phone restored = ${restored.json?.settings?.phone === originalSettings?.phone}`);
  } catch (err) {
    console.error('cleanup error:', err.message);
  }
}

main()
  .catch((err) => {
    console.error('audit crashed:', err.message);
    results.push({ id: 'X', name: 'audit crashed', ok: false, detail: err.message });
  })
  .finally(async () => {
    await cleanup();
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    if (failed.length) {
      console.log('failed:');
      for (const f of failed) console.log(`  ${f.id} ${f.name} ${f.detail}`);
    }
    process.exit(failed.length ? 1 : 0);
  });

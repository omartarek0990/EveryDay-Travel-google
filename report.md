# everyDay Travel — Performance Sprint: التقرير الكامل (Parts 1–3)

**الريبو:** https://github.com/omartarek0990/EveryDay-Travel-google
**التواريخ:** 26–27 نوفمبر 2026
**الفرع الرئيسي:** `main` @ `f0182a0` (يحتوي الأجزاء الثلاثة مدموجة)
**فروع العمل:** `perf-1-images` · `perf-2-js-cache` · `perf-3-critical-path`
**النشر الحالي:** https://everyday-wine.vercel.app (مشروع Vercel: `everyday`)

> هذا الملف يجمع: نص التقرير النهائي لكل جزء كما أُرسل، ثم الملاحظات والبنود المعلّقة الخاصة به، ثم جدول موحّد بالخطوات المتبقية.
> لا يحتوي هذا الملف على أي أسرار (لا قيم `.env` ولا `service_role key`).

---

## فهرس

| الجزء | الموضوع | الفرع | آخر كوميت | الحالة |
| --- | --- | --- | --- | --- |
| 1 | الصور (Images) | `perf-1-images` | `a5ff291` | مكتمل الكود — بند واحد معلّق (migration 0002) |
| 2 | JavaScript والخطوط والكاش | `perf-2-js-cache` | `9627084` | مكتمل — التحقق البصري فقط متبقٍ |
| 3 | المسار الحرج والحمولة والمنطقة | `perf-3-critical-path` | `f0182a0` | مكتمل — LCP معلّق على migration 0002 |

---
---

# PART 1 REPORT

> النص التالي هو تقرير الجزء الأول كما أُرسل. أي أرقام محدّثة تجدها في قسم «PART 1 — تحديثات لاحقة».

```
PART 1 REPORT

1. Branch and last commit hash
   Branch: perf-1-images (created from a baseline commit a0912dc on main)
   Last commit: a5ff291 (a5ff291e...) — "perf(images): responsive WebP variants, srcset rendering, lighter hero and seed assets"
   NOT PUSHED: this sandbox copy has no git remote and no credentials, so nothing was pushed anywhere. main was never touched. Exact push step is in section 8 and docs/PERFORMANCE.md.

2. Files changed (path — one line each)
   supabase/migrations/0002_image_variants.sql — add images.variants (jsonb) + images.avg_color (text), additive/idempotent, re-declares get_site_state/replace_site_state and re-asserts grants.
   server/db.ts — seed records now point at WebP variants (id/variants/avgColor included); toSnakeImage/fromSnakeImage map variants + avg_color with null-tolerant parsing; seed photo bytes/dimensions from the manifest.
   server/storage.ts — signUpload accepts an object `key` (Supabase + STATIC), new ImageStorage.exists(), sanitizeUploadKey(), imageVariantObjectId(), imageVariantBasePath().
   server/routes.ts — /uploads/sign passes the key; /uploads/local signs and honours the key; /uploads/verify accepts {avgColor, variants:{format,widths}}, verifies every variant exists, derives basePath server-side, stores both fields.
   server/storage.test.ts — new: variant path mapping, key sanitising, STATIC signature with/without key, tamper rejection.
   server/app.ts — /uploads served with max-age=365d, immutable.
   server.ts — dist/assets served with max-age=365d, immutable.
   src/shared/types.ts — ImageVariantFormat, ImageVariants, ImageRecord.variants/avgColor.
   src/lib/image-url.ts — new: selectVariantWidths, variantUrl, buildSrcSet, imageProps (srcset/sizes/width/height/avg color, plain-URL fallback).
   src/lib/image-url.test.ts — new: 13 tests (srcset widths, no upscaling, no-variant fallback, Cloudinary fallback, single-width, placeholder dims).
   src/lib/image-variant.ts — new: planVariantWidths, pickVariantFormat, variantMimeType, variantFileName, supportsWebpEncoding, quality constants.
   src/lib/image-upload.ts — variant generation (WebP/JPEG, sequential, from the downscaled blob), unique base name, long cache-control, avg_color, variant upload through the signed flow, Cloudinary skip, best-effort fallback.
   src/components/ResilientImage.tsx — takes an `image` record, uses imageProps, always sets width/height + decoding=async + avg-color background.
   src/components/public/HeroSlideshow.tsx — one eager/high image, outgoing image unmounted after the transition, next slide preloaded in an idle callback after first load; all hero rules untouched.
   src/components/public/TripCard.tsx — card slider uses image props + 33vw/50vw/100vw sizes.
   src/components/public/TripDetailPage.tsx (src/pages/public) — main image + thumbnails use image props; lightbox item carries the record.
   src/components/public/Lightbox.tsx — LightboxItem.image, largest variant, 100vw.
   src/components/public/AboutHighlightsBanner.tsx — hardcoded JPG replaced by a 1200w WebP with width/height, lazy, async.
   src/components/BrandLogo.tsx — logo through imageProps with width/height.
   src/App.tsx — favicon resolves the variant URL.
   src/pages/public/HomePage.tsx — gallery 9 + "Show more", image props for gallery tiles, lightbox items carry records, cv-auto on gallery/about/contact.
   src/pages/public/GalleryPage.tsx — image props (dead page kept compiling).
   src/pages/public/AboutPage.tsx — hardcoded JPG replaced by WebP with dimensions (dead page kept compiling).
   src/pages/admin/AdminGalleryPage.tsx — admin thumbnail uses image props.
   src/pages/admin/AdminTripsListPage.tsx — cover thumbnail uses image props.
   src/components/admin/ImageUploader.tsx — thumbnail uses image props (per-image progress bar unchanged).
   src/index.css — .cv-auto utility (content-visibility + contain-intrinsic-size).
   scripts/snapshot-db.ts — new read-only snapshot (row counts + image ids/urls, no content, no secrets).
   scripts/optimize-images.ts — new local-only optimiser (--seed-only/--supabase/--dry-run/--prune).
   docs/PERFORMANCE.md — baseline, before/after, manual steps, rollback.
   docs/snapshots/seed-assets.json — conversion manifest (widths, bytes, avg colors).
   data/db.json — legacy fixture images updated to the new URLs/variants.
   package.json / package-lock.json — scripts snapshot:db + optimize:images, sharp devDependency.
   README.md — documents the two new scripts.
   api/index.js — rebuilt bundle.
   Removed: 9 × src/assets/images/*.jpg, 10 × public/assets/aistudio/* (unreferenced, 5.5 MB).
   Added: 27 × public/assets/img/*-w{480,768,1200}.webp.

3. Commands run and results
   npm run typecheck → exit 0, no output.
   npm test → 5 test files, 35 tests passed (434 ms).
   npm run build → "dist/assets/index-CwtPZil7.js 595.04 kB │ gzip: 172.44 kB" / "✓ built in 500ms"; dist total 2.70 MB in 30 files.
   npm run build:api → api/index.js 141.3kb.
   Production smoke (NODE_ENV=production, tsx server.ts): GET /assets/img/hero_dahab_redsea_…-w480.webp → 200, image/webp, cache-control "public, max-age=31536000, immutable", 27,588 bytes; GET /ar → 200 (1.5 KB shell).
   npm run optimize:images -- --seed-only --dry-run → "[seed] converted 9, skipped 10, removed 0, 14033 KB -> 0 KB".
   npm run optimize:images -- --seed-only → "[seed] converted 9, skipped 10, removed 0, 14033 KB -> 2124 KB".
   npm run optimize:images -- --seed-only --prune → "[seed] converted 0, skipped 19, removed 19, 14033 KB -> 0 KB".
   Seed data check: every src/srcSet URL produced from createSeedDatabase() exists on disk (0 missing).

4. Numbers
   dist: 14.32 MB before → 2.70 MB after (target < 3 MB).
   Largest image file in the repo: 1,372 KB public/assets/aistudio/image_57f8909f.png before → 222 KB public/assets/img/trip_dahab_snorkeling_…-w1200.webp after (target < 250 KB).
   Repo images: 19 files / 13.7 MB → 27 files / 2.07 MB.
   Widths generated for the seed: 480, 768, 1200 (sources are 1200–1376 px wide, so 1600/2000 are skipped, never upscaled).
   Upload pipeline widths: 480, 768, 1200, 1600, 2000 (capped by the source, max side 2560).
   Seed images converted: 9 photos → 27 WebP files; 10 unreferenced aistudio files deleted instead of converted.
   Home page seed image weight: 274 KB on mobile (all 9 images at 480w), ~110 KB for a first viewport (hero + 3 cards + gallery); 1,244 KB if all nine were requested at 1200w on desktop.
   Largest seed variants: hero 105–184 KB at 1200w, 15–44 KB at 480w; trip cards 125–222 KB at 1200w.
   Optimize dry-run summary: converted 9, skipped 10, removed 0, 14033 KB → 0 KB (planned).

5. Migration
   File: supabase/migrations/0002_image_variants.sql
   Changes: `alter table public.images add column if not exists variants jsonb;`,
   `alter table public.images add column if not exists avg_color text;`, column comments,
   and `create or replace` of get_site_state()/replace_site_state() (bodies unchanged:
   to_jsonb(row) already exposes the new columns, jsonb_populate_recordset leaves absent
   keys null), plus re-asserted grants. It is additive and safe to re-run.
   Works when NOT applied: reads (`select *` → missing key → null) and writes (extra JSON
   keys are ignored by jsonb_populate_recordset) both keep working; every image simply
   renders from its single original url. Covered by tests for `variants: null` and by the
   Cloudinary fallback test. The only loss is that variants saved by a new client are not
   persisted until the migration is applied (they silently fall back on the next load).

6. Backward compatibility checks done
   - imageProps with variants=null → single original url, no srcset, no sizes (unit test).
   - imageProps with provider CLOUDINARY → single url, no srcset (unit test).
   - imageProps never emits a width above the source (unit test).
   - fromDbState/toDbState round-trip still equal to the seed (existing test, now with variants).
   - fromDbState tolerates missing/garbled variants jsonb (returns null).
   - Old uploader clients that send no variants/key keep working: verify stores variants=null,
     STATIC signatures still validate without a key (unit test).
   - Every seed variant URL resolves to a real file (checked against createSeedDatabase()).
   - Production build served the WebP variant with the expected content-type and cache headers.

7. Not done, deviations and assumptions
   - Not pushed and no Vercel Preview was produced: no git remote/credentials in the sandbox.
   - npm run snapshot:db was not executed and docs/snapshots/before-part1.json does not exist:
     no Supabase credentials in the sandbox. The command is documented for Omar.
   - optimize-images --supabase was not executed (would write to production): no Supabase
     credentials here; its dry-run path also requires a configured project, so only the seed
     dry-run is captured above.
   - The 10 public/assets/aistudio/* files were deleted rather than converted: nothing in
     src/server/index.html referenced them, and converting them would have shipped dead weight
     against the 3 MB dist budget.
   - Desktop hero at 1200w is 105–184 KB on most photos, i.e. under the 150 KB lower bound in
     the target, because the seed sources are only 1376 px wide (2000w variants are impossible
     without upscaling).
   - Variants are also produced for the STATIC (local) storage provider, using a key-signed
     upload; Cloudinary intentionally gets no variants (it transforms on the fly).
   - The gallery "Show more" button reuses the existing messages.actions.showMore string; no
     new copy was introduced.
   - Seed conversion used sharp via scripts/optimize-images.ts; the seed records in db.ts and
     data/db.json were rewritten from the script's manifest (docs/snapshots/seed-assets.json).
   - Added sharp as a devDependency only; no other dependency added. Express static caching for
     /assets and /uploads was raised to 1 year, which is not strictly image-only but is needed
     for the "efficient cache policy" audit item.
   - Unchanged on purpose: no SSR/pre-render, no LCP text work, no JS code splitting (part 2/3
     territory), hero interval/alternation/reduced-motion rules untouched.

8. Manual steps left for Omar (exact)
   a) From a machine with the GitHub repo:
      git checkout perf-1-images
      git push -u origin perf-1-images
      (Never push main; Vercel deploys main to production.)
   b) Optional baseline snapshot, before applying the migration, with .env present:
      npm run snapshot:db
      → writes docs/snapshots/before-part1.json
   c) Supabase → SQL Editor → run the whole file supabase/migrations/0002_image_variants.sql.
   d) Locally, after (c):
      npm run optimize:images -- --supabase --dry-run
      npm run optimize:images -- --supabase
      → uploads WebP variants for every image row that has none, writes variants + avg_color,
        prints converted/skipped/failed and bytes before/after, deletes nothing.
   e) Open the Vercel Preview and check, in DevTools → Network: first hero image is eager and
      fetches …-w480.webp on a phone viewport (…-w1200.webp on desktop); subsequent hero slides
      are lazy and preloaded after the first load; trip cards, trip detail gallery, lightbox and
      gallery "Show more" all request -wNNN variants with no 404s; a gray/average-color
      placeholder shows while loading.
   f) Upload one large JPEG and one HEIC from /admin → progress bar reaches 100%, the new row
      renders with srcset in /admin and on the public site, and the HEIC still uploads as a
      single original (no variants).
   g) Rollback if needed: `update public.images set variants = null, avg_color = null;` and
      redeploy an earlier commit. Nothing in Storage is deleted by this branch.

9. Risks to check by hand
   - Supabase signed-upload CORS: variant PUTs send a Cache-Control header. If Supabase rejects
     that header, variant uploads fail silently (base image still uploads, row keeps variants=null)
     — check the Network tab on the Preview after one upload.
   - Server-side variant existence check costs one storage list call per width (up to 5 per
     upload). Fine for a single-owner dashboard, but watch upload latency on a slow connection.
   - content-visibility: auto on #gallery/#about/#contact may shift the target of an anchor link
     slightly on first scroll (contain-intrinsic-size is an estimate); check /ar#about and
     /ar#contact on mobile.
   - dist is 2.70 MB, close to the 3 MB ceiling: adding more bundled photos without converting
     them will breach it.
   - optimize-images --supabase assumes the public object URL or a signed URL for the
     site-images bucket; if the bucket was made private, confirm the download path works.
   - Lightbox uses sizes="100vw", so desktop may pick a larger variant than needed — acceptable
     now, tune in a later part if the lightbox shows up in LCP work.
   - The old production rows keep their original JPEG upload URL as `url`; the app prefers
     variants, but anything outside the app that deep-links `url` still works (no deletions).
```

## PART 1 — تحديثات لاحقة (ما تغيّر بعد كتابة التقرير)

| البند | ما كان في التقرير | الوضع النهائي |
| --- | --- | --- |
| الفرع | لم يُرفع ("NOT PUSHED") | **مرفوع**: `origin/perf-1-images` @ `a5ff291` |
| `main` | لم يُلمس | دُمج لاحقًا بطلب منك → `main` صار يحتوي الجزء الأول |
| النشر | لا معاينة (لا يوجد Preview) | نُشر على Vercel (`part1-virid` ثم `part2` ثم `everyday`) |
| `snapshot:db` | لم يُشغَّل | **شُغِّل بنجاح** على قاعدة البيانات الحقيقية (نسخة التحقق) — لكن `before-part1.json` **لم يُنشأ** حتى الآن |
| `optimize:images --supabase` | لم يُشغَّل | **لم يُشغَّل** — انظر المعلّقات |

## PART 1 — الملاحظات والبنود التي تحتاج تنفيذًا

**حاجز (يمنع اكتمال الجزء فعليًا):**
1. **تطبيق `supabase/migrations/0002_image_variants.sql`** — لم يُطبَّق حتى الآن، والنتيجة المؤكدة من `verify:supabase`:
   `FAIL images.variants / images.avg_color — missing (column images.variants does not exist)`
   وبسببه: `WARN images without variants — 9 of 9`.
   **بعد التطبيق:** شغّل `npm run db:seed` ثم `npm run optimize:images -- --supabase --dry-run` ثم `--supabase` (لو ظهرت صور بلا variants).
2. **`docs/snapshots/before-part1.json` غير موجود** — ولّده بـ`npm run snapshot:db` (اختياري لكنه مطلوب للمقارنة التاريخية).

**ملاحظات/انحرافات موثّقة:**
3. حذف 10 ملفات `public/assets/aistudio/*` (5.5 MB) بدل تحويلها — لأنها غير مستخدمة.
4. الهيرو على الديسكتوب 105–184 KB (تحت الحد الأدنى 150 KB في الهدف) لأن المصادر 1376px فقط، ولا يجوز التكبير.
5. `dist` كان 2.70 MB، وقرب السقف (3 MB) خطر للمستقبل.
6. مجموعة الصور في التخزين (`site-images`) = **0 ملفات** لأن صور الـseed مضمّنة في الريبو، لا في Supabase Storage.

---
---

# PART 2 REPORT

> النص التالي هو تقرير الجزء الثاني كما أُرسل. الأرقام النهائية في قسم «PART 2 — تحديثات لاحقة».

```
PART 2 REPORT

1. Branch and last commit hash
   Branch: perf-2-js-cache (created from main @ 3a91ec2, i.e. after part 1)
   Last commit: 55baed6 — "perf(js): split admin and trip routes, self-host fonts, cache the public API"
   Pushed: yes (origin/perf-2-js-cache). main untouched: local main == origin/main == 3a91ec2.
   Preview deployment built from this tree: https://part1-o2i4x96ly-omar-f68d.vercel.app (Vercel Deployment Protection is on for previews; it needs a Vercel login to open).

2. Files changed (path — one line each)
   index.html — removed the three Google Fonts links and both preconnects.
   src/main.tsx — imports the two self-hosted font stylesheets instead.
   src/index.css — font families point at the variable fonts; one @font-face for the vendored Playfair italic 600 (latin only).
   public/fonts/playfair-display-italic-600-latin.woff2 — new, 22.6 KB, single weight.
   vite.config.ts — new `preload-arabic-font` build plugin that injects the hashed Cairo Arabic woff2 preload.
   src/App.tsx — dashboard and trip detail are React.lazy; admin removed from the root tree.
   src/admin/AdminApp.tsx — new: AdminAuthProvider + all /admin routes (one lazy chunk group).
   src/components/public/PageSkeletons.tsx — new: trip-detail skeleton and admin shell skeleton.
   src/lib/prefetch.ts — new: one-shot trip-detail chunk prefetch.
   src/components/public/TripCard.tsx — React.memo + prefetch on mouseenter/focus.
   src/components/public/HomeGallery.tsx — new: owns gallery pagination and lightbox state; lazy Lightbox.
   src/pages/public/HomePage.tsx — uses HomeGallery, idle-prefetches the trip chunk, no lightbox state.
   src/components/PublicDataContext.tsx — memoized value, `refresh({fresh})`, no-store removed from the normal fetch.
   src/components/admin/AdminAuthContext.tsx — post-save refresh uses `?fresh=1`.
   server/cache-headers.ts — new: cache policy for /api paths + middleware.
   server/cache-headers.test.ts — new: 5 tests (public / fresh / auth / admin / uploads / middleware).
   server/app.ts — applies the middleware, and forces no-store on API 5xx.
   vercel.json — headers only: fonts + images rules, /admin exact match; rewrites untouched.
   package.json / package-lock.json — motion + autoprefixer removed, build tools moved to devDependencies, two font packages added.
   README.md — caching section (60 s edge cache, fresh=1, immutable assets).
   docs/PERFORMANCE.md — part 2 section (bundle table, fonts, cache rules, manual steps).
   api/index.js — rebuilt bundle.

3. Commands run and results
   npx tsc --noEmit → exit 0.
   npx vitest run → 6 test files, 40 tests passed.
   npm run build → "dist/assets/index-DQUohQo5.js 262.27 kB │ gzip: 78.97 kB" (plus the chunks in the table below); dist total 2.86 MB.
   npm run build:api → "api/index.js 142.0kb".
   Bundle externals (must stay in dependencies) verified from the built file: @google/genai, @supabase/supabase-js, bcryptjs, express, zod, node:crypto, node:fs, node:path, dotenv/config, express-async-errors.
   Bundle load test: `node -e "import('./api/index.js')"` → "bundle loaded, express app: function", exit 0.
   npx knip → unused files: api/index.js + the four never-routed public pages (AboutPage, ContactPage, GalleryPage, TripsPage); unused deps: @hookform/resolvers, react-hook-form; unused devDep: @types/bcryptjs.

4. Bundle table (raw / gzip, from npm run build)
   | Chunk | Before | After |
   | Entry index-*.js | 595.04 KB / 172.44 KB | 262.27 KB / 78.97 KB |
   | ResilientImage-*.js (shared, loaded with the landing page) | — | 58.15 KB / 21.63 KB |
   | Initial public JS | 595.04 KB / 172.44 KB | 320.42 KB / 100.60 KB gzip |
   | AdminApp-*.js | inside the entry chunk | 266.86 KB / 73.12 KB (lazy) |
   | TripDetailPage-*.js | inside the entry chunk | 10.26 KB / 2.98 KB (lazy) |
   | Lightbox-*.js | inside the entry chunk | 2.78 KB / 1.15 KB (lazy) |
   | index-*.css | 54.86 KB / 9.64 KB | 60.81 KB / 12.76 KB |
   Initial public JS = 100.6 KB gzip (target ≤ 110 KB) ✅.

5. Dependencies
   Removed: motion (never imported), autoprefixer (unused with the Tailwind v4 Vite plugin).
   Moved to devDependencies: vite, vitest, @vitejs/plugin-react, @tailwindcss/vite, esbuild, tsx, @types/bcryptjs, @types/express, @types/node, @types/react, @types/react-dom.
   Kept in dependencies because the serverless function imports them: express, express-async-errors, @supabase/supabase-js, bcryptjs, zod, dotenv, @google/genai (still used by GeminiTranslateProvider in server/translation.ts).
   Kept in dependencies as client runtime: react, react-dom, react-router-dom, lucide-react, sonner, @dnd-kit/*, react-hook-form, @hookform/resolvers.
   knip result is in section 3. react-hook-form/@hookform/resolvers are genuinely unused (0 imports) but were left installed — removing them was out of this part's scope.

6. Fonts
   Added: @fontsource-variable/cairo, @fontsource-variable/plus-jakarta-sans (both variable, font-display: swap, unicode-range subsets).
   Playfair Display: kept. It is the italic accent of the "Every" wordmark (BrandLogo, `--font-script`), i.e. visible design, so dropping it would have changed the design. It is vendored as one weight (600 italic), Latin subset only, from Google's static file into public/fonts/ — no third package and no request to fonts.googleapis.com / fonts.gstatic.com (verified: the deployed HTML contains no google font reference).
   Files a page downloads:
   - Arabic landing: cairo-arabic-wght-normal 30.9 KB (preloaded) + playfair italic 22.6 KB; cairo-latin 33.8 KB only if Latin glyphs render.
   - English landing: plus-jakarta-sans-latin 26.7 KB + playfair italic 22.6 KB; cairo-arabic if Arabic fallback text renders.
   The main Arabic woff2 is preloaded through a build-time Vite plugin because the file name is content-hashed.

7. Requests on a public page load
   - No /api/auth/* and no /api/admin/*: the built entry chunk contains zero occurrences of "/api/auth", "/api/admin", "dnd-kit" or "sonner"; those live only in AdminApp-*.js (7 /api/auth calls). Verified on the deployed entry chunk (fetched from the preview) as well as locally.
   - No Google Fonts request: deployed HTML has no fonts.googleapis/gstatic reference and the CSS carries only local font URLs.
   - Public load still requests GET /api/public/site (expected), the entry JS, the shared ResilientImage chunk, the CSS and the two font files.

8. Cache headers
   Server (server/cache-headers.ts, applied app-wide in server/app.ts; tested):
   - /api/public/* → `public, s-maxage=60, stale-while-revalidate=600`
   - /api/public/*?fresh=1 → `no-store`
   - /api/auth/*, /api/admin/*, /api/uploads/* → `no-store`
   - API 5xx responses → `no-store`
   Client: the normal public fetch no longer sends cache:"no-store"; only the admin refresh calls `refreshPublic({ fresh: true })` → `/api/public/site?fresh=1`.
   vercel.json (headers only, rewrites byte-identical to main):
   - /assets/(.*) → `public, max-age=31536000, immutable`
   - /fonts/(.*) → `public, max-age=31536000, immutable`
   - /uploads/(.*) → `public, max-age=31536000, immutable`
   - /assets/img/(.*) → `public, max-age=604800, stale-while-revalidate=86400` (names are not content-hashed; this rule is listed after /assets to take precedence)
   - /admin and /admin/(.*) → X-Robots-Tag: noindex, nofollow
   Verified on the preview: JS/CSS/woff2 → `public, max-age=31536000, immutable`; a seed webp → `public, max-age=604800, stale-while-revalidate=86400`; `/api/public/site?fresh=1` → `no-store`; `/api/auth/me` → `no-store`; repeated /api/public/site returned x-vercel-cache MISS then HIT, so the edge cache is active.

9. Not done, deviations and assumptions
   - Lighthouse was not run: no browser in this sandbox and the PageSpeed API returned 429 (quota). All numbers here are build-size measurements, not field/Lighthouse scores.
   - No before/after screenshots: no browser available. Font/italic/RTL equivalence is reasoned (same families, same weights, self-hosted) but must be eyeballed.
   - No `size-adjust` fallback metrics were added: any swap-induced shift could not be measured here; see Risks.
   - The four never-routed public pages (AboutPage/ContactPage/GalleryPage/TripsPage) still exist and are still unreferenced (they were not split or deleted; out of scope).
   - knip's unused dependencies (@hookform/resolvers, react-hook-form) were reported but not removed.
   - The preview is behind Vercel Deployment Protection; to verify it I let `vercel curl` add a Protection Bypass for Automation secret, then revoked it (0 bypass secrets remain). Deployment Protection itself is still `all_except_custom_domains`.
   - I added the six Supabase env vars to the Preview environment as well (Production already had them), via the Vercel API, so previews can hit the database.
   - On protected preview responses Vercel normalises the visible Cache-Control of cached function responses to `public`; the origin value is asserted by unit tests and the CDN behaviour (MISS→HIT) confirms s-maxage is honoured.
   - vercel.json `rewrites` were not touched (confirmed by diff).
   - dist grew from 2.70 MB to 2.86 MB because of the self-hosted font files (118 KB); still under the part-1 3 MB ceiling but with little headroom.

10. Manual steps left for Omar (exact)
   a) The branch is pushed; to get a Preview from Git, connect the project to the repository (Project → Settings → Git → Connect `EveryDay-Travel-google`, branch `main` for production). Previews are otherwise manual (`npx vercel deploy` from the branch).
   b) Open the preview (log in to Vercel if the protection page appears) and check Arabic and English: fonts, the italic "Every" wordmark, RTL alignment, and that nothing shifts while the font loads.
   c) Compression: `curl -I -H 'Accept-Encoding: br' <preview>/assets/<entry js>` → expect `content-encoding: br`.
   d) Log in to /admin, save a small change: it must appear in the dashboard immediately, and on the public site within about 60 s (documented in the README).
   e) Run Lighthouse (mobile + desktop) on the preview and compare with the part 1 baseline.
   f) If everything is fine: merge perf-2-js-cache into main (Vercel then deploys production) — I did not push main.

11. Risks to check by hand
   - Font swap CLS: self-hosted variable fonts with `font-display: swap` can shift text; no fallback metrics were tuned. Check the CLS number and the hero heading on a throttled mobile profile.
   - The lazy /admin tree changes route mounting (nested `<Routes>` under `/admin/*`): verify /admin, /admin/trips/new, /admin/trips/:id, deep-link refresh and the login redirect still work.
   - The public page now depends on the 60 s edge cache: after an owner edit, the public site may show stale content for up to a minute; confirm the dashboard itself is immediate (`?fresh=1`).
   - Playfair is now a single weight/italic-only Latin file: if any place used another weight or an Arabic glyph in that family, it will fall back to Georgia.
   - `/assets/img/(.*)` relies on rule ordering in vercel.json; if Vercel ever applies the generic `/assets` rule last, seed images would become immutable-for-a-year while still not being content-hashed — re-check that header after any change to the headers array.
   - dist is 2.86 MB, close to 3 MB: adding more bundled assets will breach the part-1 ceiling.
```

## PART 2 — تحديثات لاحقة

| البند | ما كان في التقرير | الوضع النهائي |
| --- | --- | --- |
| آخر كوميت | `55baed6` | **`9627084`** (بعد إزالة `useMemo` زائدة أُضيفت بالخطأ خارج الثلاثة المسموحين) |
| الحالة | لم يُدمج في main | **مدموج** في `main` |
| Lighthouse | لم يُقَس | **قيس في الجزء 3**: أداء موبايل 0.94 وسيط، a11y 93، BP 100، SEO 100 |
| الكاش | `/api/public/site` | العميل الآن يستخدم `/api/public/landing` (الجزء 3) — نفس السياسة |

## PART 2 — الملاحظات والبنود التي تحتاج تنفيذًا

**تحقق يدوي متبقٍ (لا يمكن آليًا):**
1. **مقارنة الخطوط بصريًا**: عربي/إنجليزي، شكل `Every` المائل، واتجاه RTL — على الرابط الحي.
2. **CLS بعد تحميل الخط** على موبايل مُبطّأ. ملاحظة: لم تُضف `size-adjust` لأن الانحراف لم يُقَس؛ **لو ظهر انحراف** فهذا البند يحتاج تنفيذًا.
3. **`curl -I -H 'Accept-Encoding: br'`** للتأكد من `content-encoding: br` — (تم التحقق منه في الجزء 3: `PASS content-encoding br`).
4. **تسجيل الدخول للأدمن + حفظ تغيير** ومشاهدته فورًا في اللوحة (ثم على الموقع بعد ~60 ثانية).

**ملاحظات/انحرافات:**
5. `react-hook-form` و`@hookform/resolvers` **غير مستخدمين فعليًا** (أبلغ عنهما knip) — يمكن حذفهما في جلسة تنظيف.
6. `@types/bcryptjs` غير مستخدم (knip).
7. الصفحات الأربع الميتة (`AboutPage`, `ContactPage`, `GalleryPage`, `TripsPage`) **غير موصولة بأي Route** وموجودة في الريبو — قرار مطلوب: ربطها أو حذفها.
8. `dist` ارتفع إلى 2.86 MB بسبب الخطوط — الهامش تحت 3 MB أصبح ضيقًا.

---
---

# PART 3 REPORT

> النص التالي هو تقرير الجزء الثالث كما أُرسل. آخر كوميت الآن `f0182a0` بعد تصحيح README.

```
PART 3 REPORT

1. Branch and last commit hash
   Branch: perf-3-critical-path (created from main @ 9627084, i.e. parts 1 + 2 merged)
   Last commit: 427aa2d — "test(perf): lighthouse wrapper, measured budgets and verification results"
   Previous commit on the branch: 92baf8c — "perf(critical-path): slim payload, HTML shell, region, timeouts, optimistic UI and verification"
   Pushed: yes (origin/perf-3-critical-path == 427aa2d). main untouched: local main == origin/main == 9627084.
   Preview/Production deployment used for verification: https://part2-pied-alpha.vercel.app (the project's own production alias after the old project was deleted; see section 9).

2. Files changed (path — one line each)
   vercel.json — rewrites for /, /ar, /en, /ar/*, /en/* to the function; regions ["fra1"]; functions.includeFiles + maxDuration; headers untouched except nothing removed.
   server/html-shell.ts — new: template loading, head/meta/OG/Twitter injection, site-data script, hero preload + Supabase preconnect, escaping, failsafe wrapper.
   server/html-shell.test.ts — new: 8 tests (lang/dir, escaping, hero preload picks first image, trip meta, canonical/hreflang, no-template and throw fallbacks).
   server/app.ts — HTML shell routes for /ar|/en (+subpaths), root Accept-Language redirect moved here, HTML cache headers, non-blocking DB load for HTML routes, CSP no longer allows Google Fonts, 5xx no-store.
   server/db.ts — buildLandingPayload, buildTripPayload, buildGalleryPage, publicSettings/galleryWithImages helpers, 8 s abort signal on both RPCs.
   server/routes.ts — new /api/public/landing, /api/public/trips/:slug, /api/public/gallery; old /api/public/site kept; cleanupOrphanImages storage deletes in Promise.all.
   server/supabase.ts — SUPABASE_TIMEOUT_MS = 8000, supabaseAbortSignal(), withSupabaseTimeout().
   server/storage.ts — timeouts on createSignedUploadUrl, list (verify + exists) and remove.
   src/shared/types.ts — TripCardData, PublicLandingPayload, GalleryPagePayload.
   src/components/PublicDataContext.tsx — reads #site-data first (no fetch, no skeleton), idle revalidation, fetch fallback; readInjectedSiteData/readInjectedTrip exported.
   src/components/public/HomeGallery.tsx — paged "Show more" via /api/public/gallery, follows revalidated payload, owns lightbox state.
   src/pages/public/HomePage.tsx — uses data.gallery.items/total instead of galleryImages.
   src/pages/public/TripDetailPage.tsx — injected trip when the slug matches, otherwise GET /api/public/trips/:slug; similar trips by destination slug.
   src/components/public/TripCard.tsx — accepts TripCardData.
   src/pages/public/GalleryPage.tsx — reads data.gallery.items (dead page kept compiling).
   src/pages/admin/AdminTripsListPage.tsx — optimistic publish/hide toggle and reorder with rollback + error toast.
   src/pages/admin/AdminDestinationsPage.tsx — optimistic reorder with rollback.
   src/pages/admin/AdminGalleryPage.tsx — optimistic reorder with rollback.
   src/App.tsx — Speed Insights injected after window.load via dynamic import.
   scripts/verify-supabase.ts — new: read-only PASS/WARN/FAIL verification (env, schema, RPC latency, data integrity, images, storage, live site).
   scripts/perf.mjs — new: wrapper so `npm run perf -- <url>` reaches lhci with `--collect.url=<url>`.
   lighthouserc.cjs — new: mobile budgets (perf 0.9, LCP 2500, TBT 200, CLS 0.1, script 200 KB gzip), 3-run median.
   package.json / package-lock.json — @vercel/speed-insights (dependency), @lhci/cli (devDependency), scripts perf + verify:supabase.
   docs/PERFORMANCE.md — part 3 section, measured Lighthouse table, verification output, failsafe result, three-part summary table.
   .gitignore — .lighthouseci/
   api/index.js — rebuilt bundle (157.1 KB).

3. Commands run and results
   npx tsc --noEmit → exit 0.
   npx vitest run → 7 files, 48 tests passed (was 40; +8 html-shell).
   npm run build → index-BE7M9qve.js 263.44 kB / gzip 79.35 kB; AdminApp 267.52 kB / 73.20 kB; TripDetailPage 10.68 kB / 3.19 kB; Lightbox 2.78 kB / 1.15 kB; ResilientImage 58.15 kB / 21.63 kB; CSS 60.81 kB / 12.76 kB; dist 2.86 MB.
   npm run build:api → api/index.js 157.1kb.
   npm run verify:supabase -- --site-url=https://part2-pied-alpha.vercel.app → 26 PASS, 5 WARN, 1 FAIL (full list in section 8).
   npm run perf -- https://part2-pied-alpha.vercel.app → ran 3× mobile; median perf 0.94, LCP 3.0 s (FAIL), TBT 90 ms, CLS 0.
   Local production smoke (real Supabase): /ar 200 17.5 KB with site-data 13.1 KB + hero preload + lang="ar" dir="rtl"; /en lang="en" dir="ltr"; /ar/trips/dahab-red-sea-escape 23.4 KB with trip og:title; / 302 → /ar.
   Failsafe: with an unreachable SUPABASE_URL, GET /ar → 200, 1,365 bytes, no site-data, Cache-Control: public, max-age=0, s-maxage=5.

4. vercel.json (final)
   {
     "buildCommand": "npm run build && npm run build:api",
     "outputDirectory": "dist",
     "regions": ["fra1"],
     "functions": { "api/index.js": { "includeFiles": "dist/index.html", "maxDuration": 10 } },
     "headers": [
       /assets/(.*)      → Cache-Control: public, max-age=31536000, immutable
       /uploads/(.*)     → public, max-age=31536000, immutable
       /fonts/(.*)       → public, max-age=31536000, immutable
       /assets/img/(.*)  → public, max-age=604800, stale-while-revalidate=86400
       /admin, /admin/(.*) → X-Robots-Tag: noindex, nofollow
     ],
     "rewrites": [
       { "/api/(.*)"     → "/api/index.js" },
       { "/uploads/(.*)" → "/api/index.js" },
       { "/robots.txt"   → "/api/index.js" },
       { "/sitemap.xml"  → "/api/index.js" },
       { "/"             → "/api/index.js" },
       { "/ar"           → "/api/index.js" },
       { "/en"           → "/api/index.js" },
       { "/ar/(.*)"      → "/api/index.js" },
       { "/en/(.*)"      → "/api/index.js" },
       { "/(.*)"         → "/index.html" }
     ]
   }
   Order is checked: /api/*, /uploads/*, robots.txt and sitemap.xml are matched before the locale rules, and static files under /assets are served from the filesystem before any rewrite (Vercel checks the filesystem first), so none of them is captured. Verified live: /assets/img/*.webp → 200 image/webp, /admin → 200, /api/public/* → JSON, /robots.txt and /sitemap.xml → their real content types.

5. Payload (from the real seed response)
   GET /api/public/site (old, still served): 23,115 bytes
   GET /api/public/landing (new slim): 14,914 bytes (−35%)
   injected site-data inside /ar: 13.1 KB
   GET /api/public/trips/:slug (one full trip): 5,662 bytes
   GET /api/public/gallery?offset=&limit=: paged, 3 items per request in the check
   The landing payload carries card data only (first 3 images per trip, no itinerary/activities/long description) plus the first 9 gallery items and `total`. The 1 s in-memory cache and its in-flight guard in loadDb() are unchanged.

6. HTML injection
   Injected into the built shell for /, /ar, /en, /ar/*, /en/*:
   - <script id="site-data" type="application/json"> with the slim payload (plus the full trip on a trip route), escaping < as \u003c and U+2028/U+2029;
   - <title>, description, canonical, hreflang ar/en/x-default, og:type/site_name/title/description/url/locale/image, twitter:card/title/description/image — a trip URL uses the trip title + tagline + cover image;
   - <html lang="ar|en" dir="rtl|ltr">;
   - <link rel="preload" as="image" imagesrcset=... imagesizes="100vw" fetchpriority="high"> for the first hero image, and <link rel="preconnect" crossorigin> to the Supabase storage origin.
   Cache header: public, max-age=0, s-maxage=60, stale-while-revalidate=600.
   Failsafe: renderShell is wrapped by safeRenderShell (try/catch); on any throw, a missing template or an unreachable database the untouched template is served with public, max-age=0, s-maxage=5 and the error is logged. Tested two ways: unit test with a payload that throws on JSON.stringify (returns the exact template, injected=false), and a live server run with a bogus Supabase URL → 200, 1,365 bytes, no site-data, s-maxage=5. The client falls back to fetching /api/public/landing in that case.

7. Region and timeouts
   Region: fra1 (Frankfurt). maxDuration: 10 s. Supabase timeout: SUPABASE_TIMEOUT_MS = 8000, applied with AbortSignal.timeout on get_site_state and replace_site_state and with withSupabaseTimeout() on createSignedUploadUrl, storage list (verify), storage list (exists) and storage remove. Parallelism: cleanupOrphanImages now issues all storage deletes in one Promise.all; the upload variant existence checks were already parallel. Documented in docs/PERFORMANCE.md: how to read the Supabase region (Project Settings → General → Region), how to change the Vercel function region (Project → Settings → Functions, or `regions` in vercel.json), and the recreate-and-reimport escape hatch (db:import + db:seed) if the database is far from Egypt.

8. verify:supabase (run from D:\EveryDay-Travel-google-main, i.e. Egypt; latency reflects that)
   PASS  SUPABASE_URL
   PASS  SUPABASE_SERVICE_ROLE_KEY
   PASS  SUPABASE_STORAGE_BUCKET (site-images)
   FAIL  images.variants / images.avg_color — missing (column images.variants does not exist) ← migration 0002 not applied
   WARN  get_site_state latency (5 calls) — first 2635 ms, median 1794 ms (2635/1104/1794/2213/326)
   WARN  row counts vs before-part1.json — snapshot missing; current: images=9 trips=3 trip_images=6 gallery_images=6 destinations=6 itinerary_days=9 optional_activities=4
   PASS  referenced image ids exist — no dangling references
   PASS  referenced image urls answer 200 — 0 broken
   PASS  variant urls answer 200 with image type — 0 misses (nothing to check yet)
   PASS  variant cache-control max-age >= 31536000 — all long-lived
   WARN  images without variants — 9 of 9
   PASS  bucket site-images exists
   PASS  bucket site-images public
   PASS  storage objects — 0 objects, 0.00 MB (seed images are bundled, not in Storage)
   PASS  original (non-variant) files — 0
   PASS  /api/public/landing 200
   WARN  landing cache-control — "public" (Vercel normalises the header on cached function responses)
   PASS  fresh=1 is no-store
   PASS  /api/auth/me reachable (200)
   PASS  /api/auth/me no-store
   PASS  / 200, /ar 200, /en 200, /sitemap.xml 200, /robots.txt 200
   PASS  /ar contains site-data
   PASS  /ar preloads the hero image
   PASS  /ar html lang/dir — <html lang="ar" dir="rtl">
   WARN  html cache-control — "public, max-age=0" (same Vercel normalisation)
   PASS  content-encoding — br
   PASS  /ar/trips/dahab-red-sea-escape 200
   PASS  trip page has og:title
   Summary: 26 PASS, 5 WARN, 1 FAIL (exit 1)

   Lighthouse (mobile, 3 runs): perf 0.85 / 0.94 / 0.95 (median 0.94), LCP 4.3 / 3.0 / 2.9 s (median 3.0 s, target 2.5 s), TBT 90/90/30 ms, CLS 0, FCP ~1.0 s, SI 2.1 s, TTFB 80–100 ms.

9. Not done, deviations and assumptions
   - LCP misses the 2.5 s target (median 3.0 s). Cause is the unapplied 0002 migration: with `variants = null` every image falls back to a 1200 px WebP (~189 KB hero) and the mobile preload cannot offer the 480 px variant. Everything else (perf score 0.94, TBT, CLS) already meets the part-3 targets.
   - The old Vercel project was deleted by Omar and a new empty `part2` project was created, so the previous deployment alias (part2-lovat) disappeared; the current production alias is part2-pied-alpha.vercel.app. I restored the six environment variables and set Deployment Protection to "preview only" (it defaulted to protecting production, which made every URL return Vercel's login page).
   - `docs/snapshots/before-part1.json` still does not exist, so the row-count comparison is a WARN (documented; `npm run snapshot:db` generates it).
   - The 0001 indexes cannot be verified through PostgREST; the script reports that as a WARN pointing at the SQL editor.
   - Storage reports 0 objects because all seed images are bundled in the repo; the bucket exists and is public.
   - Vercel normalises Cache-Control on cached function responses to `public`, so the landing/html cache checks are WARNs; the s-maxage behaviour is still proven (x-vercel-cache MISS → HIT in part 2, and unit tests assert the origin value).
   - The repo still keeps the old full /api/public/site endpoint (nothing else uses it now, but the part requires keeping it during this part).
   - The four never-routed public pages (AboutPage, ContactPage, GalleryPage, TripsPage) are still unreachable dead code; only GalleryPage was updated so the project keeps typechecking.
   - Lighthouse uploads go to temporary public storage and the run needs a local Chrome (it worked here); it is not part of the build.
   - Speed Insights is wired but will only report after Omar enables it in the Vercel dashboard.

10. Manual steps left for Omar (exact)
   a) Apply the migration: Supabase → SQL Editor → run supabase/migrations/0002_image_variants.sql. Then locally:
      npm run db:seed
      npm run optimize:images -- --supabase --dry-run
      npm run optimize:images -- --supabase
      npm run verify:supabase -- --site-url=https://part2-pied-alpha.vercel.app
      (Expect the variants FAIL to turn PASS and "images without variants" to drop to 0.)
   b) Re-run the budget check: `npm run perf -- https://part2-pied-alpha.vercel.app` — LCP should drop under 2.5 s once the 480 px hero variant is served to mobile.
   c) Enable Speed Insights: Vercel → project `part2` → Speed Insights → Enable.
   d) Optional baseline snapshot for future comparisons: `npm run snapshot:db` (writes docs/snapshots/before-part1.json).
   e) Merge when satisfied: `git checkout main && git merge --ff-only perf-3-critical-path && git push origin main` (Vercel then deploys production). I did not push main.
   f) Confirm the Supabase region (Project Settings → General); if it is not in Europe, change `regions` in vercel.json to match it.

11. Risks to check by hand on the Preview URL
   - Trip page opened via client-side navigation (from a card) versus a hard reload: both must render; the reload path uses the injected trip, the in-app path calls /api/public/trips/:slug.
   - HTML is now server-rendered per request: confirm /ar and /en still hydrate without a skeleton flash and without a duplicate data request in DevTools (one request maximum).
   - The 60 s edge cache means an owner edit appears on the public HTML after up to a minute; the dashboard itself must update immediately (fresh=1).
   - Dashboard optimistic UI: toggle publish and drag a trip while offline/throttled to see the rollback + error toast.
   - Rewrite order: verify /admin, /assets/*, /fonts/*, /uploads/*, /robots.txt, /sitemap.xml and a deep link like /ar/trips/<slug> all still resolve correctly after deployment.
   - Deployment Protection: production must stay public while previews are protected; a wrong setting makes the whole site show a Vercel login page (this happened once during this part).
   - Missing template at runtime (includeFiles): if `dist/index.html` is not bundled, every HTML route falls back to the plain shell — the page still works but loses SEO/meta and the preload. Check the HTML source for `site-data` on a cold deployment.
```

## PART 3 — تحديثات لاحقة

| البند | ما كان في التقرير | الوضع النهائي |
| --- | --- | --- |
| آخر كوميت | `427aa2d` | **`f0182a0`** (تصحيح ملاحظة الكاش في README) |
| الحالة | لم يُدمج | **مدموج** في `main` |
| رابط النشر | `part2-pied-alpha` | **`everyday-wine.vercel.app`** (مشروع `everyday`) |
| `verify:supabase` | 26 PASS / 5 WARN / 1 FAIL | **27 PASS / 4 WARN / 1 FAIL** على الرابط الجديد |
| نتائج Lighthouse | لم تُفحص فئتا a11y/BP/SEO | **مقيسة**: a11y **93**، BP **100**، SEO **100** |
| المنطقة | `fra1` مُعلنة | **مؤكدة فعليًا**: `x-vercel-id: fra1::fra1::…` |

## PART 3 — الملاحظات والبنود التي تحتاج تنفيذًا

**حاجز واحد فقط (نفس حاجز الجزء الأول):**
1. **تطبيق `0002_image_variants.sql`** → بعده يُتوقع:
   - تحوّل `FAIL images.variants` إلى **PASS**.
   - `images without variants: 9 of 9` → **0**.
   - الهيرو على الموبايل: 189 KB → **~27 KB** (نسخة 480w).
   - **LCP من 3.0s إلى أقل من 2.5s** (البند الوحيد الفاشل في Lighthouse).

**بنود يدوية:**
2. **تمكين Speed Insights** في لوحة Vercel لمشروع `everyday` (الكود جاهز، لا يرسل شيئًا قبل التمكين).
3. **تأكيد منطقة Supabase** (Project Settings → General) — إن لم تكن أوروبا، غيّر `regions` في `vercel.json`.
4. **`npm run snapshot:db`** لإنشاء `docs/snapshots/before-part1.json` (يزيل WARN ويُفعّل المقارنة).

**ملاحظات/انحرافات:**
5. **`sitemap.xml` لسه يُدرج `/ar/trips`, `/ar/gallery`, `/ar/about`, `/ar/contact`** وهي مسارات تحويل (redirect) إلى مراسٍ في الرئيسية — خلل قديم من الجزء الأول لم يُعالَج (خارج نطاق الأجزاء الثلاثة).
6. **لا RPC جديد لقاعدة البيانات**: الترشيح يحدث في الذاكرة، أي أن `get_site_state` **لا يزال يُرجع الحالة كاملة** (~23 KB) والانخفاض في استجابة المتصفح فقط.
7. **Vercel يُطبّع ترويسة الكاش** (`Cache-Control: public, max-age=0`) للاستجابات المُخزَّنة من الدوال، لذلك بندا الكاش في `verify` يظهران WARN رغم صحة `s-maxage`.
8. **a11y = 93 بالضبط** (الحد الأدنى): سببان قديمان في التصميم — `color-contrast` و`target-size` — لم يُمَسّا التزامًا بقاعدة «لا تغيير في التصميم».
9. `dist` = 2.86 MB بهامش ضيّق تحت 3 MB.
10. المشاريع القديمة على Vercel (`part1`, `part2`) ما زالت موجودة ولم تُحذف.

---
---

# جدول موحّد: كل ما يحتاج تنفيذًا (بالأولوية)

| # | المهمة | الجزء | الأولوية | يمنع ماذا |
| --- | --- | --- | --- | --- |
| 1 | تطبيق `supabase/migrations/0002_image_variants.sql` في Supabase SQL Editor | 1 (+3) | **حرجة** | LCP < 2.5s · اكتمال بنود الجزء 1 · FAIL في verify |
| 2 | `npm run db:seed` بعد التطبيق | 1 | حرجة | تفعيل `variants` في البيانات الحالية |
| 3 | `npm run optimize:images -- --supabase` (لو ظهرت صور بلا variants) | 1 | عالية | تغطية أي صورة مرفوعة قديمة |
| 4 | `npm run perf -- https://everyday-wine.vercel.app` بعد (1) لتأكيد LCP | 3 | عالية | إثبات الهدف النهائي |
| 5 | تمكين Speed Insights في لوحة Vercel | 3 | متوسطة | بيانات RUM حقيقية |
| 6 | `npm run snapshot:db` لإنتاج `before-part1.json` | 1 | متوسطة | إزالة WARN + مرجع مستقبلي |
| 7 | تأكيد منطقة Supabase ومطابقتها مع `fra1` | 3 | متوسطة | زمن استجابة RPC (~1.8s من مصر) |
| 8 | تحقق يدوي: خطوط/RTL/`Every` المائل + CLS | 2 | متوسطة | التأكد من عدم تغيّر التصميم |
| 9 | تحقق يدوي: دخول الأدمن + حفظ تغيير + تراجع optimistic | 2+3 | متوسطة | تأكيد سلوك اللوحة |
| 10 | إصلاح `sitemap.xml` (إزالة مسارات التحويل) | 1 | منخفضة | SEO نظيف |
| 11 | حذف `react-hook-form` + `@hookform/resolvers` + `@types/bcryptjs` | 2 | منخفضة | تنظيف الحزم |
| 12 | حسم مصير الصفحات الميتة الأربع (ربط أو حذف) | 1+2 | منخفضة | كود ميت |
| 13 | إضافة `size-adjust` لو ظهر انحراف خطوط | 2 | عند الحاجة | CLS |
| 14 | حذف مشاريع Vercel القديمة (`part1`, `part2`) | — | منخفضة | تكلفة/ارتباك |

## الأوامر الجاهزة

```bash
# 1) بعد تطبيق الـmigration في Supabase SQL Editor
npm run db:seed
npm run optimize:images -- --supabase --dry-run
npm run optimize:images -- --supabase
npm run verify:supabase -- --site-url=https://everyday-wine.vercel.app

# 2) قياس الأداء
npm run perf -- https://everyday-wine.vercel.app

# 3) مرجع للمقارنة
npm run snapshot:db
```

## الحالة النهائية للمستودع

```
main                    f0182a0  (Parts 1 + 2 + 3 مدموجة)
origin/main             f0182a0
perf-1-images           a5ff291
perf-2-js-cache         9627084
perf-3-critical-path    f0182a0
```

## أرقام نهائية (بناء محلي)

| المقياس | خط الأساس | بعد الجزء 1 | بعد الجزء 2 | بعد الجزء 3 |
| --- | --- | --- | --- | --- |
| `dist/` | 14.32 MB | 2.70 MB | 2.86 MB | 2.86 MB |
| JS عام أولي (gzip) | 172.44 KB | 172.44 KB | 100.60 KB | ~101 KB |
| حمولة الصفحة العامة | 23.1 KB (كل شيء) | 23.1 KB | 23.1 KB | 14.9 KB (landing) + 5.7 KB لكل رحلة |
| أكبر صورة في الريبو | 1,372 KB PNG | 222 KB WebP | 222 KB | 222 KB |
| Lighthouse موبايل | 44 | — | — | **94** |
| LCP موبايل | — | — | — | **3.0s** (يحتاج migration) |
| TBT / CLS | — | — | — | **90ms / 0** |
| Accessibility / BP / SEO | — | — | — | **93 / 100 / 100** |

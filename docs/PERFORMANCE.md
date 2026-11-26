# Performance sprint — part 1: images

Prepared for Omar, 26 Nov 2026. Branch: `perf-1-images`.
Scope of this part: image weight, responsive delivery, hero rendering and the
upload/seed pipeline. No design, copy, RTL or dashboard behaviour changes.

## Baseline (production, measured by Omar) and local build baseline

| Metric | Before | After (local build) |
| --- | --- | --- |
| Lighthouse mobile Performance | 44 | to be measured on the Preview URL |
| Lighthouse desktop Performance | 39–54 | to be measured on the Preview URL |
| `dist/` total size | 14.32 MB | **2.70 MB** |
| Largest image file in the repo | 1,372 KB (`public/assets/aistudio/image_57f8909f.png`) | **222 KB** (`trip_dahab_snorkeling…-w1200.webp`) |
| Seed photography in the repo | 19 files, 13.7 MB (`src/assets/images` 8.19 MB + `public/assets` 5.52 MB) | 27 WebP variants, 2.07 MB |
| Home page image weight, mobile (480w) | ~8 MB if all originals were requested | **274 KB** for all 9 seed images (≈110 KB for a full first viewport) |

Targets of this part: hero 60–100 KB mobile / 150–250 KB desktop, no home page
image above 250 KB, mobile home page image weight under 700 KB, `dist` under 3 MB.
All four are met by the local build except that the hero at 1200w lands at
105–184 KB (below the 150 KB lower bound on two of the six hero photos); the
largest available hero variant is 1200px because the seed sources are 1376px.

## What changed

### 1. Data model (`supabase/migrations/0002_image_variants.sql`)

Additive, idempotent, nullable columns:

- `images.variants jsonb` — `{ "format": "webp" | "jpg", "widths": [480, 768, …], "basePath": "everyday/<uuid>" }`.
  Variant files live at `<basePath>-w<width>.<format>`.
- `images.avg_color text` — `#rrggbb`, used as the loading background.

The migration re-declares `get_site_state()` and `replace_site_state()` unchanged
(`to_jsonb(row)` already serialises new columns; `jsonb_populate_recordset`
leaves absent keys null), so old payloads and new payloads both round-trip.

**Backward compatibility:** the app works with the migration *not* applied and
with rows that have `variants = null`. Such images render exactly as before,
with a single `src`. The only effect of a missing column is that the upload
verification step cannot persist variants (see "Manual steps").

### 2. Upload pipeline (`src/lib/image-upload.ts`)

- After the existing EXIF-corrected downscale, the browser encodes WebP variants
  at 480/768/1200/1600/2000 (widths larger than the source are skipped, never
  upscaled) at quality 0.78, one at a time to bound phone memory.
- WebP encoding support is detected with `canvas.toDataURL('image/webp')`;
  otherwise JPEG q0.8 is uploaded and `format: "jpg"` is recorded.
- All files of one upload share a unique base name (`<uuid>`, variants
  `<uuid>-w768.webp`) and are uploaded through the existing signed upload flow
  with `Cache-Control: max-age=31536000`. Objects are never overwritten.
- `avg_color` is sampled from a 1×1 canvas draw and sent with the verify request.
- HEIC and undecodable files still upload the original untouched (no variants),
  and a variant failure never fails the upload.
- The dashboard uploader keeps its per-image progress bar; the percentage now
  covers the base upload plus the variant uploads.

### 3. Server verification (`server/routes.ts`, `server/storage.ts`)

- `/api/uploads/sign` accepts an optional `key`, so every file of an upload can
  share a base name; `/api/uploads/local` signs and verifies that key too.
- `/api/uploads/verify` accepts `{ avgColor, variants: { format, widths } }`,
  checks that every variant object actually exists in storage
  (`ImageStorage.exists`) before writing the row, and derives `basePath` on the
  server. Missing or unverifiable variants are rejected; old clients that send
  no `variants` keep working (row stored with `variants = null`).
- Cloudinary images never store variants (Cloudinary transforms on the fly).

### 4. Rendering (`src/lib/image-url.ts`, `ResilientImage`)

- `imageProps(image, { sizes, maxWidth })` returns `src`, `srcSet`, `sizes`,
  `width`, `height` and `backgroundColor`. Without variants (or with a provider
  that cannot serve them) it returns the plain original `url`.
- `ResilientImage` now takes an `image` record, always sets `width`/`height`,
  `decoding="async"` and the average color as a background while loading.
- Used by: hero, trip card slider, trip detail gallery + thumbnails, home gallery,
  lightbox (largest variant), about banner, logo, favicon, and the admin
  thumbnail lists.
- Suggested sizes: cards `(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw`;
  hero and lightbox `100vw`.

### 5. Hero (`HeroSlideshow.tsx`)

- Only the first hero image is `loading="eager"` + `fetchPriority="high"`.
- Only the active image is mounted; the outgoing one stays mounted for the
  750 ms transition (200 ms with reduced motion) and is then unmounted.
- The next slide is preloaded in an idle callback, and only after the first image
  has loaded.
- All hero rules are unchanged: 3–15 s interval, fade/slide alternation,
  direction-aware slide, tab-hidden pause, `prefers-reduced-motion`.

### 6. Gallery and below-the-fold work

- Home gallery shows 9 images, then a "Show more" button (same pattern as trips).
- `#gallery`, `#about` and `#contact` use `content-visibility: auto` with
  `contain-intrinsic-size` (`.cv-auto` in `src/index.css`).

### 7. Existing images (`scripts/optimize-images.ts`)

```bash
npm run optimize:images -- --seed-only --dry-run   # plan only, writes nothing
npm run optimize:images -- --seed-only             # convert bundled seed photos
npm run optimize:images -- --seed-only --prune     # also delete unreferenced originals
npm run optimize:images -- --supabase --dry-run    # plan production backfill
npm run optimize:images -- --supabase              # backfill production variants
```

Dry-run summary captured before the conversion:

```
[seed] converted 9, skipped 10, removed 0, 14033 KB -> 0 KB
```

After the conversion (originals pruned, so a rerun is a no-op):

```
[seed] converted 0, skipped 0, removed 0, 0 KB -> 0 KB
```

Converted seed files (widths 480/768/1200, WebP q78): 9 photos, 14,033 KB → 2,124 KB.
The 10 unreferenced `public/assets/aistudio/*` files (5.5 MB) were removed instead
of converted, to keep `dist` small.

`--supabase` downloads each existing row, generates the same variant widths,
uploads them with `cacheControl: 31536000`, and writes `variants` + `avg_color`
on the row. It never deletes anything from Storage and keeps the old `url`, so a
rollback is `update images set variants = null, avg_color = null where …`.

## Verification performed in this branch

- `npm run typecheck` — passes.
- `npm test` — 35 tests, 5 files (image URL helper, variant planning, storage
  variant paths, static upload signatures, seed round-trip).
- `npm run build` — passes; `dist` 2.70 MB.
- `npm run build:api` — passes.
- Seed data renders the right variant files: every `src`/`srcSet` URL produced
  from `createSeedDatabase()` exists on disk (0 missing).
- Old data path verified by tests: `variants: null` → single original `url`, no
  `srcSet`; Cloudinary images → single `url`.

## Manual steps for Omar

1. **Snapshot (optional, before anything):** with `.env` present locally
   ```bash
   npm run snapshot:db
   ```
   writes `docs/snapshots/before-part1.json` (row counts + image ids/urls, no
   content, no secrets). This sandbox had no Supabase credentials, so it was not
   run here.

2. **Push the branch** (Vercel deploys `main` to production, so never push main):
   ```bash
   git push -u origin perf-1-images
   ```
   The Vercel Preview build should succeed and run without the migration.

3. **Apply the migration** in Supabase → SQL Editor:
   `supabase/migrations/0002_image_variants.sql`.

4. **Backfill existing images** locally (after the migration):
   ```bash
   npm run optimize:images -- --supabase --dry-run   # review the plan
   npm run optimize:images -- --supabase             # upload + update rows
   ```

5. **Test the Preview**: hero slideshow (first image eager, no flash between
   slides), trip cards, trip detail lightbox, gallery "Show more" (9 at a time),
   then upload a photo from `/admin` and confirm in DevTools → Network that
   `…-w480.webp`, `…-w768.webp`, `…-w1200.webp` are requested and the row shows a
   color placeholder while loading.

6. **Rollback**: `update public.images set variants = null, avg_color = null;`
   then redeploy any commit before this branch. No storage object is deleted by
   this branch.

---

# Performance sprint — part 2: JavaScript, fonts and caching

Branch `perf-2-js-cache`. Scope: JS/CSS/fonts/dependencies/cache headers only.
No design, copy, RTL, hero-rule or dashboard-feature changes; `vercel.json`
rewrites untouched.

## Bundle before and after

Measured locally with `npm run build` (raw / gzip as reported by Vite).

| Chunk | Before (raw / gzip) | After (raw / gzip) | Notes |
| --- | --- | --- | --- |
| Entry `index-*.js` | 595.04 KB / 172.44 KB | **262.27 KB / 78.97 KB** | landing page + router + shared UI |
| `ResilientImage-*.js` (shared, loaded on the landing page) | — | 58.15 KB / 21.63 KB | shared by home + lazy pages |
| **Initial public JS** | **595.04 KB / 172.44 KB** | **320.42 KB / 100.60 KB** | target ≤ 110 KB gzip ✅ |
| `AdminApp-*.js` | (inside the 595 KB chunk) | 266.86 KB / 73.12 KB | lazy, only /admin |
| `TripDetailPage-*.js` | (inside the 595 KB chunk) | 10.26 KB / 2.98 KB | lazy + prefetched |
| `Lightbox-*.js` | (inside the 595 KB chunk) | 2.78 KB / 1.15 KB | lazy, only on open |
| `index-*.css` | 54.86 KB / 9.64 KB | 60.81 KB / 12.76 KB | +3.1 KB gzip from self-hosted `@font-face` rules |
| `dist/` total | 2.70 MB | 2.86 MB | +fonts (118 KB) |

Requests on a first public load: 1 HTML, 1 CSS, 2 JS (entry + shared
`ResilientImage` chunk), 1–2 woff2 subset files (see below). No Google Fonts
request, no `/api/auth/*`, no `/api/admin/*`.

## What changed

### Admin code and calls
`AdminAuthProvider` moved out of the app root into `src/admin/AdminApp.tsx`,
which is a `React.lazy` route mounted only at `/admin/*`. The entry chunk now
contains no `/api/auth`, `/api/admin`, `@dnd-kit` or `sonner` code (verified by
grepping the built chunk); the admin chunk contains all seven `/api/auth` calls.

### Code splitting
`TripDetailPage`, `Lightbox` and the whole dashboard are lazy. Suspense
fallbacks are skeleton screens with the same dimensions as the real content
(`src/components/public/PageSkeletons.tsx`). `ar.json`/`en.json` are 3.2 KB and
2.6 KB raw (<1 KB gzip), so they stay in the main chunk (a dynamic import would
add a request before first render). All `lucide-react` imports are named imports,
so tree shaking works.

### Prefetch
`src/lib/prefetch.ts` warms the trip-detail chunk from the landing page: in an
idle callback after mount, and on `mouseenter`/`focus` of a trip card.

### Dependencies
Removed `motion` (never imported) and `autoprefixer` (unused with Tailwind v4).
Moved `vite`, `vitest`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `esbuild`,
`tsx` and every `@types/*` to `devDependencies`. Everything the server bundle
imports stays in `dependencies`; `npm run build:api` reports these externals and
the bundle loads in plain Node:

```
@google/genai, @supabase/supabase-js, bcryptjs, express, zod, node:crypto,
node:fs, node:path, dotenv/config, express-async-errors
```

`npx knip` (run once, not added to package.json) reported: unused files
`api/index.js` (build artifact) and the four never-routed public pages
(`AboutPage`, `ContactPage`, `GalleryPage`, `TripsPage`); unused dependencies
`@hookform/resolvers` and `react-hook-form`; unused devDependency
`@types/bcryptjs`. Those are left untouched (out of scope for this part) except
for the moves listed above.

### Fonts
Google Fonts links and preconnects removed from `index.html`. Self-hosted with
`@fontsource-variable/cairo` (Arabic + Latin + Latin-ext subsets) and
`@fontsource-variable/plus-jakarta-sans` (Latin + Latin-ext), both
`font-display: swap`. The main Arabic woff2 is preloaded through a small Vite
plugin (`preload-arabic-font` in `vite.config.ts`) because the file is emitted
with a content hash.

Playfair Display is **kept**: it is the italic accent of the "Every" wordmark in
`BrandLogo`, which is visible design. It is vendored as a single weight
(600 italic), Latin subset only, at
`public/fonts/playfair-display-italic-600-latin.woff2` (22.6 KB) — no third
package and no Google request.

Font files a page downloads:

| Page | Files |
| --- | --- |
| Arabic landing | `cairo-arabic-wght-normal` (30.9 KB) + `playfair-…-latin` (22.6 KB); `cairo-latin` (33.8 KB) only if Latin glyphs appear |
| English landing | `plus-jakarta-sans-latin` (27.3 KB) + `playfair-…-latin` (22.6 KB); `cairo-arabic` if Arabic fallback text renders |

Fallback font metrics (`size-adjust`) were not added: a swap-induced shift could
not be measured in this sandbox. Verify CLS on the preview (see Risks).

### Re-renders
- Hero timer state was already inside `HeroSlideshow`; unchanged.
- Lightbox open/close state moved from `HomePage` into
  `src/components/public/HomeGallery.tsx`, together with the "Show more"
  counter.
- `TripCard` is wrapped in `React.memo`; the `PublicDataContext` value is
  memoized with `useMemo`. No other memoization was added.

### Cache headers
Server (`server/cache-headers.ts`, applied in `server/app.ts`):

| Path | Cache-Control |
| --- | --- |
| `/api/public/*` | `public, s-maxage=60, stale-while-revalidate=600` |
| `/api/public/*?fresh=1` | `no-store` |
| `/api/auth/*`, `/api/admin/*`, `/api/uploads/*` | `no-store` |
| API error responses (5xx) | `no-store` |

The client drops `cache: 'no-store'` from the normal public fetch; only the
admin refresh (`refreshPublic({ fresh: true })`) requests `?fresh=1`, so the
dashboard shows a saved edit immediately while public visitors may see it up to
60 s later (documented in the README).

`vercel.json` (headers only, rewrites untouched):

| Source | Cache-Control |
| --- | --- |
| `/assets/(.*)` (hashed Vite output) | `public, max-age=31536000, immutable` |
| `/fonts/(.*)` | `public, max-age=31536000, immutable` |
| `/uploads/(.*)` | `public, max-age=31536000, immutable` |
| `/assets/img/(.*)` (not content-hashed) | `public, max-age=604800, stale-while-revalidate=86400` |

Tests: `server/cache-headers.test.ts` covers public vs. `fresh=1` vs.
auth/admin/upload and the Express middleware.

### Compression
No compression middleware was added (Vercel compresses at the platform level).
Manual check:

```bash
curl -I -H 'Accept-Encoding: br' https://<preview-url>/assets/<main js file> \
  && # expect: content-encoding: br
```

## Manual steps for Omar

1. Push the branch and open the Vercel Preview (connect the project to Git first
   if previews are not automatic).
2. Check `content-encoding: br` with the curl command above.
3. Run Lighthouse (mobile + desktop) and compare with the part 1 baseline.
4. Log in to `/admin`, save a small change, and confirm it appears in the
   dashboard immediately and on the public site within ~60 s.
5. Switch AR/EN and confirm the fonts and the italic "Every" wordmark look the
   same as before, and that there is no visible shift when the font loads.


# everyDay Travel Agency

Bilingual (Arabic RTL default + English LTR) showcase website and Arabic RTL owner management dashboard for **everyDay Travel Agency** — domestic trips across Egypt.

## Key Features

- **Public Showcase (`/ar/...` and `/en/...`)**:
  - Automatic `/` redirect via `Accept-Language` (falling back to `/ar`), language switcher preserving path and query parameters, `hreflang` alternates, and dynamic `sitemap.xml` / `robots.txt`.
  - 3-layer hero slideshow with alternating fade/slide transitions (direction-aware RTL/LTR), tab-visibility pause, and `prefers-reduced-motion` support.
  - Trips catalog with query-parameter destination filters (`?dest=...`), equal-height cards with embedded lazy 4:3 image sliders, and "Show more" pagination.
  - Detailed trip pages with photo lightbox, day-by-day itinerary timeline, optional activities (`Free` / `Extra cost`), similar trips, and JSON-LD structured data.
  - Direct WhatsApp (`https://wa.me/...`) and `tel:` actions everywhere — no customer accounts, checkout, or contact forms.
- **Owner Dashboard (`/admin`, Arabic RTL only)**:
  - Protected by `bcryptjs` (cost 12) password hashing, 15-minute lockout after 5 failed attempts per username+IP, and SHA-256 hashed 32-byte opaque sessions.
  - First-run owner creation either via the `/admin/login` setup screen (when no owner exists) or via CLI (`npm run create-owner`).
  - Automatic Arabic -> English translation on save via swappable `TranslationProvider` (`GoogleTranslateV2Provider` REST or `GeminiTranslateProvider`), preserving manual English overrides (`enManual`) and offering retry on failure.
  - Browser-side image downscaling (max 2560px) + signed upload verification via `ImageStorage` (`CloudinaryStorage` or `StaticStorage` fallback) and drag-to-reorder lists.

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Supabase project and apply the schema:
   1. Open [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
   2. Go to **SQL Editor**, paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.
   3. Go to **Project Settings → API** and copy the **Project URL** and the **service_role** key.
3. Copy `.env.example` to `.env` and fill in the Supabase values:
   ```bash
   cp .env.example .env
   ```
   ```env
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   SUPABASE_STORAGE_BUCKET=site-images
   ```
   > The `service_role` key is server-only. Never expose it in the browser bundle or commit `.env`.
4. Optional: seed the default content, or import the existing `data/db.json` content and owner account:
   ```bash
   npm run db:seed
   # or
   npm run db:import
   ```
5. Run development server (Express + Vite on port 3000):
   ```bash
   npm run dev
   ```
6. Build & start production server:
   ```bash
   npm run build
   npm run build:api
   npm start
   ```

## Scripts

- `npm run dev` — Start development server on port 3000
- `npm run build` — Build frontend bundle into `dist/`
- `npm run build:api` — Bundle the Express app into `api/index.js` for Vercel
- `npm run start` — Start production Express server
- `npm run typecheck` / `npm run lint` — Run TypeScript strict type checking
- `npm test` — Run Vitest unit tests
- `npm run db:seed` — Reset Supabase content to the default seed data (owner accounts are untouched)
- `npm run db:import` — Import the legacy `data/db.json` content and owner accounts into Supabase
- `npm run create-owner` — Create an owner account interactively or via `--username <name> --password <pass>`
- `npm run reset-password -- --username <name>` — Generate a one-time temporary password, set `mustChangePassword`, and revoke active sessions
- `npm run snapshot:db` — Read-only row counts + image ids/urls into `docs/snapshots/` (no content, no secrets)
- `npm run optimize:images -- --seed-only|--supabase [--dry-run] [--prune]` — Local-only WebP variant generator for bundled seed photos and existing Supabase rows (see `docs/PERFORMANCE.md`)

## Supabase Architecture

- **Content tables**: `site_settings`, `hero_images`, `destinations`, `trips`, `trip_images`, `itinerary_days`, `optional_activities`, `gallery_images`, `images`.
- **Auth tables**: `users`, `sessions`, `login_attempts` (custom bcrypt auth, not Supabase Auth).
- **Reads/writes**: `server/db.ts` calls two Postgres functions:
  - `get_site_state()` — returns the whole dashboard-editable state as JSON.
  - `replace_site_state(payload)` — atomically replaces it in one transaction.
  Auth tables are managed with targeted queries so session refreshes never overwrite content edits.
- **Security**: RLS is enabled on every table and all `anon`/`authenticated` privileges are revoked. Only the `service_role` key (server-side) can access the data.
- **Images**: uploaded directly to the public `site-images` Storage bucket through short-lived signed upload URLs; only the object path is persisted in the database. Set `IMAGE_STORAGE=cloudinary` to keep using Cloudinary instead.

## External Integrations Configuration

### 1. Supabase Storage (default image storage)
The SQL migration creates a public `site-images` bucket. The server signs a short-lived upload URL, the browser uploads the image directly to Supabase, and only the object path is stored in `images.public_id`. No extra configuration is required beyond `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. If you rename the bucket, update `SUPABASE_STORAGE_BUCKET` and the bucket name in the SQL migration.

### 2. Cloudinary Signed Upload Preset (optional fallback)
Set `IMAGE_STORAGE=cloudinary` to keep using Cloudinary.
1. In Cloudinary Console -> **Settings -> Upload -> Upload Presets**, create a **Signed** preset (e.g. `everyday_signed`).
2. Configure an **Incoming Transformation** with `c_limit,w_2560,h_2560` and `q_auto:good` so uploaded assets stay sharp and lightweight.
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLOUDINARY_UPLOAD_PRESET` in `.env` (or Secrets). When unset and `IMAGE_STORAGE` is empty, `StaticStorage` handles local/preview uploads in `public/uploads`.

### 3. Google Cloud Translation API Key (Basic v2)
1. Enable **Cloud Translation API** in Google Cloud Console.
2. Create an API key restricted specifically to **Cloud Translation API**.
3. Set `TRANSLATION_PROVIDER=google` and `GOOGLE_TRANSLATE_API_KEY=<your-key>` on the server environment (never exposed to the client bundle).

### 4. Owner Account & Password Reset (Runbook for Omar)
- To create the first owner account from CLI:
  ```bash
  npm run create-owner -- --username omar --password "<strong-password-min-10-chars>"
  ```
- If the owner forgets their password, reset it manually via CLI:
  ```bash
  npm run reset-password -- --username omar
  ```
  Share the printed temporary password once; the owner will be forced to set a new password immediately upon login.

### 5. Deploying to Vercel
Add these environment variables in **Vercel → Project → Settings → Environment Variables**:

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only key |
| `SUPABASE_STORAGE_BUCKET` | no | Defaults to `site-images` |
| `SESSION_SECRET` | recommended | Keeps upload signatures stable across instances |
| `OWNER_RECOVERY_CODE` | optional | Enables `/admin/reset` |
| `GOOGLE_TRANSLATE_API_KEY` | optional | Auto translation |

`vercel.json` now runs `npm run build && npm run build:api`, so `api/index.js` is regenerated from `server/vercel-entry.ts` on every deploy. Content and uploads are no longer written to the ephemeral filesystem.

## Caching

- `GET /api/public/site` is cached at the CDN for 60 seconds (`s-maxage=60, stale-while-revalidate=600`), so owner edits can take up to about a minute to appear on the public site. The dashboard itself always shows the saved change immediately: the admin refresh requests `/api/public/site?fresh=1`, which the server answers with `Cache-Control: no-store`.
- `/api/auth/*`, `/api/admin/*` and `/api/uploads/*` are always `no-store`.
- Hashed build assets (`/assets/*`), fonts (`/fonts/*`) and local uploads (`/uploads/*`) are immutable for a year; bundled seed images under `/assets/img/*` (whose names are not content-hashed) use `max-age=604800, stale-while-revalidate=86400`.


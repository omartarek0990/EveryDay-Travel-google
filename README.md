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
2. Copy `.env.example` to `.env` and fill in any optional external keys:
   ```bash
   cp .env.example .env
   ```
3. Run development server (Express + Vite on port 3000):
   ```bash
   npm run dev
   ```
4. Build & start production server:
   ```bash
   npm run build
   npm start
   ```

## Scripts

- `npm run dev` — Start development server on port 3000
- `npm run build` — Build frontend bundle into `dist/`
- `npm run start` — Start production Express server
- `npm run typecheck` / `npm run lint` — Run TypeScript strict type checking
- `npm test` — Run Vitest unit tests
- `npm run db:seed` — Reset content to default seed data (preserves owner accounts)
- `npm run create-owner` — Create an owner account interactively or via `--username <name> --password <pass>`
- `npm run reset-password -- --username <name>` — Generate a one-time temporary password, set `mustChangePassword`, and revoke active sessions

## External Integrations Configuration

### 1. Cloudinary Signed Upload Preset
1. In Cloudinary Console -> **Settings -> Upload -> Upload Presets**, create a **Signed** preset (e.g. `everyday_signed`).
2. Configure an **Incoming Transformation** with `c_limit,w_2560,h_2560` and `q_auto:good` so uploaded assets stay sharp and lightweight.
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLOUDINARY_UPLOAD_PRESET` in `.env` (or Secrets). When unset, `StaticStorage` automatically handles local/preview uploads in `public/uploads`.

### 2. Google Cloud Translation API Key (Basic v2)
1. Enable **Cloud Translation API** in Google Cloud Console.
2. Create an API key restricted specifically to **Cloud Translation API**.
3. Set `TRANSLATION_PROVIDER=google` and `GOOGLE_TRANSLATE_API_KEY=<your-key>` on the server environment (never exposed to the client bundle).

### 3. Owner Account & Password Reset (Runbook for Omar)
- To create the first owner account from CLI:
  ```bash
  npm run create-owner -- --username omar --password "<strong-password-min-10-chars>"
  ```
- If the owner forgets their password, reset it manually via CLI:
  ```bash
  npm run reset-password -- --username omar
  ```
  Share the printed temporary password once; the owner will be forced to set a new password immediately upon login.

### 4. Migrating Persistence to PostgreSQL (Neon / Supabase)
If deploying to a stateless serverless platform (such as Vercel), replace `server/db.ts` with a PostgreSQL client (Neon pooled `DATABASE_URL` + `DIRECT_URL` for migrations) matching the relational types in `src/shared/types.ts`, and configure Cloudinary env vars so uploads bypass serverless function payload limits.

# Architectural Assumptions & Decisions

1. **Runtime Adaptation (Vite + Express + React SPA)**:
   The workspace runs on the AI Studio full-stack Vite + Express TypeScript container (port 3000). Rather than replacing the platform's Vite/Express build pipeline with Next.js, all public routes (`/ar/...`, `/en/...`), SEO endpoints (`/sitemap.xml`, `/robots.txt`), API routes (`/api/...`), and the Arabic RTL owner dashboard (`/admin/...`) are served from the unified Express + React application with strict TypeScript, logical CSS (`ms-*`, `pe-*`, `start`, `end`), and dynamic `<html lang dir>` + `<head>` SEO metadata updates.

2. **Database Persistence**:
   Cloud SQL provisioning was declined by the user during setup. To keep the exact relational data model (`User`, `Session`, `LoginAttempt`, `Image`, `SiteSettings`, `HeroImage`, `Destination`, `Trip`, `TripImage`, `ItineraryDay`, `OptionalActivity`, `GalleryImage`) functional out of the box without external credentials or native binary dependencies, persistence uses an atomic JSON store (`data/db.json`) with an in-memory cache and auto-seeding on first boot. A PostgreSQL/Prisma migration path is documented in `README.md`.

3. **Auth & Preview iFrame Compatibility**:
   Sessions use 32-byte random opaque tokens hashed with SHA-256 on the server (`expiresAt` 7 days, sliding refresh once per day). To work reliably both directly in browsers and inside the cross-origin AI Studio preview iframe, the server issues an `HttpOnly; Secure; SameSite=None; Partitioned` cookie and also supports an in-memory `Authorization: Bearer <token>` header (never stored in `localStorage` or `sessionStorage`). If no owner account exists yet, `/admin/login` offers a one-time atomic first-run owner creation form, in addition to the `npm run create-owner` CLI script.

4. **ImageStorage & TranslationProvider Abstractions**:
   - `ImageStorage` implements `CloudinaryStorage` (used whenever `CLOUDINARY_*` env vars are present) and `StaticStorage` (used for the bundled Egyptian travel photography and local preview uploads in `public/uploads` when Cloudinary keys are absent).
   - `TranslationProvider` implements `GoogleTranslateV2Provider` (default when `GOOGLE_TRANSLATE_API_KEY` is configured: REST v2, single batch per save, 8s timeout, 1 retry, logs translated character count) and `GeminiTranslateProvider` (used when `TRANSLATION_PROVIDER=gemini` or when `GOOGLE_TRANSLATE_API_KEY` is unset and `GEMINI_API_KEY` is available in runtime secrets). If neither key is set or translation fails, saves succeed with `en` left empty, returning `failedFields` for retry while public English pages fall back to Arabic with `lang="ar" dir="rtl"`.

5. **No Invented Company Facts**:
   Only the placeholders and copy provided in section 12 are seeded. Phone, WhatsApp, email, address, social links, and transparent logo remain empty/optional until the owner supplies them in `/admin/settings`.

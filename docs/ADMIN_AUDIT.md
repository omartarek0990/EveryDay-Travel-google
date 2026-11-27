# Admin dashboard audit — 28 Nov 2026

Branch `audit-admin`. Read-only Supabase inspection, a full API-level audit of the
dashboard, and one fix. No design, copy, RTL or feature changes.

## Test target

The only Supabase project available was the one holding the live content, so the
audit ran against it **with the documented safeguards**:

- a temporary owner `audit-bot` was created (random password, never printed);
- every record created by the audit was prefixed `AUDIT-`;
- settings/home saves were reverted to the values captured before the test;
- the bot and its sessions were deleted at the end;
- row counts were compared with `docs/snapshots/before-audit.json` afterwards.

A staging project (`.env.audit`) was not available, so the anon-key security test
(Section 4.3) could not be run.

## Findings

Severity: P0 data loss / security hole · P1 broken stated behaviour · P2 weak
behaviour · P3 polish.

| id | severity | area | evidence | status | recommendation |
| --- | --- | --- | --- | --- | --- |
| A-01 | P1 | error mapping | `server/app.ts:145-161` — the central handler answered **500** for an oversized body (body-parser throws 413) and echoed the raw internal message in `detail` | **fixed** | keep `apiErrorStatus`/`apiErrorMessage` as the only place that maps errors |
| A-02 | P2 | sessions | `mustChangePassword` is enforced only in the UI (`src/components/admin/AdminLayout.tsx:70`, `AdminLoginPage.tsx:24`); the API still serves a session created from a temporary password | open | reject `/api/admin/*` and `/api/uploads/*` with 403 while `mustChangePassword` is true |
| A-03 | P2 | data layer | `server/db.ts` + `replace_site_state` replace the **whole** content in one transaction; two concurrent editors = last writer wins | open | optimistic concurrency (`updated_at` compare-and-swap) or per-row endpoints |
| A-04 | P2 | hardening | `server/app.ts` CSP still allows `'unsafe-inline'` and `'unsafe-eval'` (needed by the inline loader/`site-data` script today) | open | move to nonces/hashes once the inline scripts are consolidated |
| A-05 | P2 | login lockout | `server/auth.ts:65` keys attempts by `username|ip`; an attacker with many IPs is not slowed down | open | add a per-username counter on top of the per-IP one |
| A-06 | P2 | SEO | `server/seo.ts` lists `/ar|en/trips`, `/gallery`, `/about`, `/contact` in `sitemap.xml`, but the SPA redirects those to `/#…` anchors | open | publish only real routes, or restore those pages |
| A-07 | P2 | uploads | `src/lib/image-upload.ts` + `/api/uploads/verify`: if a variant is missing, the server rejects the row and the already-uploaded objects stay in Storage with no row referencing them | open | best-effort cleanup of variant objects when verification fails |
| A-08 | P3 | sessions | sliding refresh only (`server/auth.ts:442`); no absolute session lifetime | open | cap total session age (e.g. 30 days) |
| A-09 | P3 | validation | `localizedTextSchema` (`src/shared/schemas.ts:3`) has no max length; only the 2 MB body limit stops it | open | add per-field `max()` |
| A-10 | P3 | validation | `updateHomeSettingsSchema` requires exactly 3 hero features while the public hero renders `slice(0, 3)` | open | allow 1–3 and document |
| A-11 | P3 | dead code | `AboutPage`, `ContactPage`, `GalleryPage`, `TripsPage` are unreachable (no route) | open | delete or wire them |
| A-12 | P3 | audit script | `scripts/audit-admin.mjs` change-password happy path is not exercised (it would rotate the bot's password mid-run) | open | run it as the last step with a second bot |

No P0 was found: every `/api/admin/*` and `/api/uploads/*` route is guarded by
`requireOwner`, no secret reaches the client bundle, and the destructive paths are
all either guarded or confirm-gated in the UI.

## Tests

`scripts/audit-admin.mjs` — 59 checks, all passing. Groups:

| group | what it covers |
| --- | --- |
| A | 11 admin/upload routes without a session → 401, no data leaked, public routes still 200 |
| B | wrong password and unknown user → identical generic Arabic message (no enumeration), login issues an `HttpOnly` cookie, `/auth/me`, `/admin/data` |
| C | negative payloads: hero interval 2 and 16, 1 feature, invalid WhatsApp, `http://` URL, bad slug, empty Arabic name, trip without title, negative price, **oversized body → 413**, foreign `Origin` → 403, unknown ids → 404, non-array reorder → 400 |
| D | `<script>`/`'; DROP TABLE` strings stored verbatim, never rendered as HTML, payload stays valid JSON |
| E | destinations: create, duplicate-slug suffix, update, reorder, delete blocked while a trip references it |
| F | signed upload → PUT to the signed URL → verify creates the row; forged publicId rejected |
| G | gallery: add, caption update, reorder, delete (and the image row is cleaned up) |
| H | trips: create, draft, publish, hide, update, reorder, publish without an image → 400 |
| I | settings and home saves, `fresh=1` shows the change instantly, public route stays `s-maxage=60`, `fresh=1` is `no-store` |
| J | change-password wrong current → 400, weak password → 400, recovery disabled → 503, logout invalidates the session |

Unit tests added: `server/app-errors.test.ts` (4 assertions sets) covering the
status mapping (413/400/500) and that messages are Arabic and contain no internals.
Total suite: 8 files, 51 tests, all passing.

## What was checked by reading the code (not live)

- bcrypt cost 12, SHA-256 hashed session tokens, `timingSafeEqual` on the recovery
  code, 15-minute lockout, cookie flags in production (`__Host-`, `Secure`,
  `SameSite=None`, `Partitioned`) — the local run exercises the `ed_session`
  fallback because it is plain HTTP.
- Translation: only changed fields are sent (`prepareTranslationBatch`), manual
  English is preserved, and a failure saves Arabic with `failedFields` returned.
- Admin chunk isolation: `AdminApp` 71.5 KB gzip lives outside the public bundle.

## Could not be tested, and why

| item | reason |
| --- | --- |
| anon/publishable key security test | `SUPABASE_ANON_KEY` was not provided |
| real translation provider calls | no `GOOGLE_TRANSLATE_API_KEY` / `GEMINI_API_KEY` configured, so only the "no provider" path ran |
| HEIC upload | needs a real HEIC file and a browser canvas |
| browser screenshots at 390/1440 px | no click-through harness was written; the API is covered, the pixel layout is not |
| password-change happy path | would invalidate the running audit session; only the negative paths ran |
| production cookie flags | verified by reading `server/auth.ts`, not by a live HTTPS request |
| migration 0002 (`images.variants`) | never applied yet — see `supabase-manual/02_migration_0002.txt` |

## Bundle

Initial public JS = 99.75 KB gzip (entry 77.77 + shared `ResilientImage` 21.15 +
`dist-*` 0.83), budget 110 KB. Dashboard chunk 71.48 KB gzip is lazy.

## Cleanup proof

| table | before | after |
| --- | --- | --- |
| users | 1 | 1 |
| sessions | 1 | 1 |
| images | 9 | 9 |
| site_settings | 1 | 1 |
| hero_images | 3 | 3 |
| destinations | 6 | 6 |
| trips | 3 | 3 |
| trip_images | 6 | 6 |
| itinerary_days | 9 | 9 |
| optional_activities | 4 | 4 |
| gallery_images | 6 | 6 |
| login_attempts | 1 | 0 (see note) |
| storage objects | 0 | 0 |

`login_attempts` is a rolling 15-minute counter: `recordFailedLogin` deletes rows
older than the window on every failed attempt, so the single pre-existing row was
removed by the application itself during the failed-login tests. The two rows the
audit created were deleted afterwards. No content was lost.

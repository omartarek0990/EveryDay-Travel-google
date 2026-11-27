# Supabase setup from scratch

Everything needed to bring a brand-new Supabase project to the state this app
expects. Written so it can be done without help. No key ever goes into a chat,
a commit or any file in this repo.

## 0. Create the project

1. Supabase Dashboard → **New project** → pick the region **closest to Egypt**
   (Europe/Frankfurt pairs well with the Vercel region `fra1` used in `vercel.json`).
2. Save the database password you choose (you will not need it for this app, but
   you cannot recover it later).

## 1. Local `.env`

In the project root (the folder with `package.json`) create a file named exactly
`.env` (copy `.env.example`). Fill:

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret key, starts with sb_secret_>
SUPABASE_STORAGE_BUCKET=site-images
SESSION_SECRET=<32+ random characters>
```

- **Project URL**: Project Settings → Data API. Delete a trailing `/rest/v1/`.
- **Key**: Project Settings → API Keys → **Secret key**. The `anon`/publishable key
  must never go on this line. If the secret key is rejected, use the legacy
  `service_role` key from the Legacy API Keys tab.
- `.env` is git-ignored and must stay that way.

## 2. Apply the SQL, in order

The SQL lives in `supabase-manual/` as plain text files (generated locally and
git-ignored). For a **fresh** project run:

| # | file | purpose |
| --- | --- | --- |
| 1 | `01_schema_0001.txt` | all 12 tables, the two RPCs, RLS, and the `site-images` bucket |
| 2 | `02_migration_0002.txt` | `images.variants` + `images.avg_color` (idempotent) |
| 3 | `98_security_checks.txt` | read-only: RLS on, `anon`/`authenticated` have no privilege, bucket public |
| 4 | `99_verify_after.txt` | read-only: expected tables, columns, indexes, functions, bucket |

How: Supabase → **SQL Editor** → **New query** → paste the **whole** file → **Run**.
The editor executes a pasted file in one go. `01` and `02` are safe to run twice.

For an existing project that already has the tables, run only `02`, then
`03_backfill_image_variants.txt` when the bundled seed images still have no
variants, then `98` and `99`.

## 3. Seed content (only for an empty project)

`npm run db:seed` **replaces the whole content**. Run it only when the project is
completely empty and you have decided that is what you want. Otherwise import an
existing site with:

```bash
npm run backup:db                 # read-only backup of the current content
npm run db:import                 # legacy data/db.json content + owners
```

## 4. Owner account

```bash
npm run create-owner -- --username <name> --password '<strong-password>'
```

Type the password yourself; nobody else should see it. If the owner forgets it:

```bash
npm run reset-password -- --username <name>
```

The temporary password is printed once and `mustChangePassword` is set.

## 5. Images

Seed photography ships in the repo (`public/assets/img/*.webp`), so a fresh
database needs the variants recorded on the rows:

```bash
npm run db:seed                          # empty project: seed records carry variants
npm run optimize:images -- --supabase --dry-run
npm run optimize:images -- --supabase    # only for rows uploaded before variants existed
```

`optimize:images` never deletes anything from Storage.

## 6. Vercel

Project → Settings → Environment Variables, for **Production** and **Preview**:

| variable | value |
| --- | --- |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret key |
| `SUPABASE_STORAGE_BUCKET` | `site-images` |
| `SESSION_SECRET` | 32+ random characters |
| `APP_URL` | the deployed origin, e.g. `https://<project>.vercel.app` |
| `OWNER_RECOVERY_CODE` | optional; enables `/admin/reset` |

Then redeploy — environment changes do not apply to an existing deployment.

Also check that **Deployment Protection** is `preview` only, otherwise production
serves Vercel's login page instead of the site.

## 7. Verify

```bash
npm run verify:supabase -- --site-url=https://<project>.vercel.app
```

Expected: no FAIL. `images without variants` should be `0`, and the summary should
show the bucket exists and is public. `WARN` on `landing cache-control` and
`html cache-control` is normal on Vercel (it normalises the header).

Then smoke-test by hand: `/ar`, `/en`, a trip page, the gallery lightbox, log in at
`/admin`, save a small change (visible immediately in the dashboard, on the public
site within ~60 s), and upload one photo.

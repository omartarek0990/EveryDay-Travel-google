import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseAdmin, isSupabaseConfigured } from '../server/supabase.ts';

/**
 * Read-only content backup.
 *
 *   npm run backup:db
 *   npm run backup:db -- --out backups/my-backup.json
 *
 * Writes every dashboard-editable content table plus the image rows to
 * backups/content-<timestamp>.json. It never exports users, sessions or
 * login_attempts, and it never writes to the database.
 */

/** Content only. Auth tables are intentionally absent and must stay that way. */
const CONTENT_TABLES = [
  'site_settings',
  'hero_images',
  'destinations',
  'trips',
  'trip_images',
  'itinerary_days',
  'optional_activities',
  'gallery_images',
  'images',
] as const;

/** Guard: refuse to export anything that could carry a credential. */
const FORBIDDEN_TABLES = new Set(['users', 'sessions', 'login_attempts']);

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

async function main(): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.error('Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing).');
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();
  const tables: Record<string, unknown[]> = {};

  for (const table of CONTENT_TABLES) {
    if (FORBIDDEN_TABLES.has(table)) {
      throw new Error(`refusing to back up auth table: ${table}`);
    }
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      throw new Error(`failed to read ${table}: ${error.message}`);
    }
    tables[table] = data ?? [];
  }

  const snapshot = {
    createdAt: new Date().toISOString(),
    projectRef: (process.env.SUPABASE_URL ?? '').replace(/^https:\/\/([a-z0-9]{20})\.supabase\.co.*$/, '$1'),
    note: 'Content only. Auth tables (users, sessions, login_attempts) are never exported.',
    counts: Object.fromEntries(Object.entries(tables).map(([table, rows]) => [table, rows.length])),
    tables,
  };

  const outPath = path.resolve(
    process.cwd(),
    argValue('--out') ?? path.join('backups', `content-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  for (const [table, rows] of Object.entries(snapshot.counts)) {
    console.log(`  ${table.padEnd(20)} ${rows}`);
  }
  console.log(`Backup written to ${path.relative(process.cwd(), outPath)} (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
  console.log('Auth tables were not exported.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

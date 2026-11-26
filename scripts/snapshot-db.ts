import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseAdmin, isSupabaseConfigured } from '../server/supabase.ts';

/**
 * Read-only snapshot of the production content tables.
 *
 *   npm run snapshot:db            # prints and writes docs/snapshots/before-part1.json
 *   npm run snapshot:db -- --out docs/snapshots/after-part1.json
 *
 * It never writes to Supabase and never prints secrets: only row counts and the
 * image ids/publicId/url that the image performance work needs to reason about.
 */

const TABLES = [
  'users',
  'sessions',
  'login_attempts',
  'images',
  'site_settings',
  'hero_images',
  'destinations',
  'trips',
  'trip_images',
  'itinerary_days',
  'optional_activities',
  'gallery_images',
] as const;

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

async function main(): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.error(
      'Supabase is not configured in this environment (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).\n' +
        'Run `npm run snapshot:db` locally with .env present. See docs/PERFORMANCE.md.'
    );
    process.exitCode = 1;
    return;
  }

  const supabase = getSupabaseAdmin();
  const tables: Record<string, number> = {};

  for (const table of TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Failed to count ${table}: ${error.message}`);
    }
    tables[table] = count ?? 0;
  }

  // `select('*')` keeps this read-only snapshot working before migration 0002,
  // when the variants / avg_color columns do not exist yet.
  const { data: imageRows, error: imagesError } = await supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: true });
  if (imagesError) {
    throw new Error(`Failed to read images: ${imagesError.message}`);
  }

  const images = (imageRows ?? []).map((row) => ({
    id: String(row.id),
    publicId: String(row.public_id),
    url: String(row.url),
    width: typeof row.width === 'number' ? row.width : null,
    height: typeof row.height === 'number' ? row.height : null,
    bytes: typeof row.bytes === 'number' ? row.bytes : null,
    format: typeof row.format === 'string' ? row.format : null,
    hasVariants: Boolean(row.variants),
    hasAvgColor: Boolean(row.avg_color),
  }));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: 'supabase',
    tables,
    imageCount: images.length,
    images,
  };

  const outPath = path.resolve(
    process.cwd(),
    argValue('--out') ?? 'docs/snapshots/before-part1.json'
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  console.log('Row counts:');
  for (const table of TABLES) {
    console.log(`  ${table.padEnd(20)} ${tables[table]}`);
  }
  console.log(`Images: ${images.length} (with variants: ${images.filter((i) => i.hasVariants).length})`);
  console.log(`Snapshot written to ${path.relative(process.cwd(), outPath)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

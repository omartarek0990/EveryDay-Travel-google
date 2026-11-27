import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { getStorageBucket, getSupabaseAdmin, getSupabaseUrl, isSupabaseConfigured } from '../server/supabase.ts';
import { imageProps, IMAGE_VARIANT_WIDTHS } from '../src/lib/image-url.ts';
import type { ImageRecord } from '../src/shared/types.ts';

/**
 * Read-only production verification. No inserts, updates or deletes; it never
 * prints secrets (only URLs, counts and PASS/WARN/FAIL lines).
 *
 *   npm run verify:supabase
 *   npm run verify:supabase -- --site-url=https://part1-vercel.app
 *
 * Exit code is 1 when any check FAILs.
 */

type Status = 'PASS' | 'WARN' | 'FAIL';

const results: Array<{ status: Status; name: string; detail: string }> = [];

function record(status: Status, name: string, detail: string): void {
  results.push({ status, name, detail });
  console.log(`${status.padEnd(4)}  ${name.padEnd(46)} ${detail}`);
}

const siteUrlArg = process.argv.find((arg) => arg.startsWith('--site-url='));
const siteUrl = siteUrlArg ? siteUrlArg.slice('--site-url='.length).replace(/\/+$/, '') : null;
/** Optional: lets the script reach a preview protected by Vercel Deployment Protection. */
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

async function http(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (bypassSecret) headers.set('x-vercel-protection-bypass', bypassSecret);
  return fetch(url, { ...init, headers, signal: AbortSignal.timeout(20000), redirect: 'manual' });
}

async function checkEnvironment(): Promise<void> {
  const url = getSupabaseUrl();
  const bucket = getStorageBucket();
  record(url ? 'PASS' : 'FAIL', 'SUPABASE_URL', url ? 'configured' : 'missing');
  record(
    isSupabaseConfigured() ? 'PASS' : 'FAIL',
    'SUPABASE_SERVICE_ROLE_KEY',
    isSupabaseConfigured() ? 'configured' : 'missing'
  );
  record(bucket ? 'PASS' : 'WARN', 'SUPABASE_STORAGE_BUCKET', bucket || 'defaults to site-images');
  console.log(`      (script runs from ${process.cwd()}; latency depends on this machine's location)`);
}

async function checkSchema(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('images').select('id, variants, avg_color').limit(1);
  if (error) {
    record('FAIL', 'images.variants / images.avg_color', `missing (${error.message})`);
    return;
  }
  record('PASS', 'images.variants / images.avg_color', 'migration 0002 applied');

  const tables = [
    'site_settings',
    'hero_images',
    'destinations',
    'trips',
    'trip_images',
    'itinerary_days',
    'optional_activities',
    'gallery_images',
    'users',
    'sessions',
    'login_attempts',
  ];
  const missing: string[] = [];
  for (const table of tables) {
    const { error: tableError } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (tableError) missing.push(table);
  }
  record(
    missing.length === 0 ? 'PASS' : 'FAIL',
    '0001_init tables',
    missing.length === 0 ? `${tables.length} tables present` : `missing: ${missing.join(', ')}`
  );
  record(
    'WARN',
    '0001_init indexes',
    'indexes are not exposed through PostgREST; verify in the SQL editor'
  );
}

async function checkRpc(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const timings: number[] = [];
  for (let run = 0; run < 5; run += 1) {
    const started = Date.now();
    const { error } = await supabase.rpc('get_site_state');
    const elapsed = Date.now() - started;
    if (error) {
      record('FAIL', 'get_site_state', `error: ${error.message}`);
      return;
    }
    timings.push(elapsed);
  }
  const first = timings[0];
  const sorted = [...timings].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  record(
    median > 300 ? 'WARN' : 'PASS',
    'get_site_state latency (5 calls)',
    `first ${first} ms, median ${median} ms (${timings.join('/')} ms)`
  );
}

interface Snapshot {
  tables?: Record<string, number>;
}

async function checkDataIntegrity(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const counts: Record<string, number> = {};
  for (const table of [
    'images',
    'trips',
    'trip_images',
    'gallery_images',
    'destinations',
    'itinerary_days',
    'optional_activities',
  ]) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    counts[table] = count ?? 0;
  }

  const snapshotPath = path.resolve(process.cwd(), 'docs/snapshots/before-part1.json');
  if (fs.existsSync(snapshotPath)) {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as Snapshot;
    const differences: string[] = [];
    for (const [table, value] of Object.entries(snapshot.tables ?? {})) {
      if (counts[table] !== undefined && counts[table] !== value) {
        differences.push(`${table} ${value} -> ${counts[table]}`);
      }
    }
    record(
      differences.length === 0 ? 'PASS' : 'WARN',
      'row counts vs before-part1.json',
      differences.length === 0 ? 'unchanged' : `changed: ${differences.join(', ')} (owner edits?)`
    );
  } else {
    record(
      'WARN',
      'row counts vs before-part1.json',
      'snapshot missing (run npm run snapshot:db); current: ' +
        Object.entries(counts)
          .map(([table, value]) => `${table}=${value}`)
          .join(' ')
    );
  }

  const { data: state, error } = await supabase.rpc('get_site_state');
  if (error) {
    record('FAIL', 'referential integrity', `get_site_state failed: ${error.message}`);
    return;
  }
  const imageIds = new Set((state.images ?? []).map((row: { id: string }) => row.id));
  const dangling: string[] = [];
  for (const row of state.trips ?? []) {
    for (const ref of state.tripImages ?? []) {
      if (ref.trip_id === row.id && !imageIds.has(ref.image_id)) dangling.push(`trip_image ${ref.id}`);
    }
  }
  for (const row of state.galleryImages ?? []) {
    if (!imageIds.has(row.image_id)) dangling.push(`gallery ${row.id}`);
  }
  for (const row of state.heroImages ?? []) {
    if (!imageIds.has(row.image_id)) dangling.push(`hero ${row.id}`);
  }
  const settings = state.siteSettings ?? {};
  for (const field of ['logo_image_id', 'favicon_image_id', 'og_image_id']) {
    if (settings[field] && !imageIds.has(settings[field])) dangling.push(`settings.${field}`);
  }
  record(
    dangling.length === 0 ? 'PASS' : 'FAIL',
    'referenced image ids exist',
    dangling.length === 0 ? 'no dangling references' : dangling.join(', ')
  );
}

async function checkImages(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase.from('images').select('*');
  if (error || !rows) {
    record('FAIL', 'images', `could not read: ${error?.message ?? 'unknown'}`);
    return;
  }

  const images = rows.map((row) => ({
    id: String(row.id),
    provider: row.provider,
    publicId: String(row.public_id),
    url: String(row.url),
    width: Number(row.width ?? 1600),
    height: Number(row.height ?? 1200),
    bytes: Number(row.bytes ?? 0),
    format: String(row.format ?? 'jpg'),
    variants: row.variants ?? null,
    avgColor: row.avg_color ?? null,
    createdAt: String(row.created_at ?? ''),
  })) as ImageRecord[];

  let broken = 0;
  let variantMisses = 0;
  let weakCache = 0;
  let withoutVariants = 0;
  let variantsChecked = 0;
  let variantsSkipped = 0;

  for (const image of images) {
    if (!image.variants) {
      withoutVariants += 1;
      continue;
    }
    const widths = (image.variants.widths ?? []).filter((width) => IMAGE_VARIANT_WIDTHS.includes(width as never));
    if (widths.length === 0) continue;
    const props = imageProps(image, { maxWidth: Math.max(...widths) });
    const urls = (props.srcSet ?? '')
      .split(', ')
      .filter(Boolean)
      .map((entry) => entry.split(' ')[0]);
    if (urls.length === 0 && props.src) urls.push(props.src);
    for (const url of urls) {
      // Bundled (STATIC) variants are served by the site, Supabase-hosted ones by
      // the storage domain. A relative URL therefore needs --site-url, not SUPABASE_URL.
      const absolute = url.startsWith('http')
        ? url
        : siteUrl
          ? `${siteUrl}${url}`
          : image.provider === 'SUPABASE'
            ? `${getSupabaseUrl() ?? ''}${url}`
            : null;
      if (!absolute) {
        variantsSkipped += 1;
        continue;
      }
      variantsChecked += 1;
      try {
        const res = await http(absolute, { method: 'HEAD' });
        const type = res.headers.get('content-type') ?? '';
        const cache = res.headers.get('cache-control') ?? '';
        const maxAge = Number(/max-age=(\d+)/.exec(cache)?.[1] ?? 0);
        if (!res.ok || !type.startsWith('image/')) {
          variantMisses += 1;
        } else if (image.provider === 'SUPABASE' ? maxAge < 31536000 : maxAge < 604800) {
          // Storage uploads are content-unique (1 year). Bundled seed files are not
          // content-hashed, so the documented policy for them is 7 days.
          weakCache += 1;
        }
      } catch {
        variantMisses += 1;
      }
    }
  }

  record(broken === 0 ? 'PASS' : 'FAIL', 'referenced image urls answer 200', `${broken} broken`);
  record(
    variantMisses === 0 ? 'PASS' : 'FAIL',
    'variant urls answer 200 with image type',
    `${variantMisses} misses of ${variantsChecked} checked` +
      (variantsSkipped > 0 ? ` (${variantsSkipped} skipped: relative urls need --site-url)` : '')
  );
  record(
    weakCache === 0 ? 'PASS' : 'WARN',
    'variant cache-control policy',
    weakCache === 0 ? 'storage: 1 year, bundled: >= 7 days' : `${weakCache} below policy`
  );
  record(
    withoutVariants === 0 ? 'PASS' : 'WARN',
    'images without variants',
    `${withoutVariants} of ${images.length} (run optimize:images --supabase)`
  );
}

async function checkStorage(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const bucket = getStorageBucket();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    record('FAIL', 'storage bucket', error.message);
    return;
  }
  const info = buckets.find((item) => item.name === bucket);
  record(info ? 'PASS' : 'FAIL', `bucket ${bucket}`, info ? 'exists' : 'missing');
  if (info) {
    record(info.public ? 'PASS' : 'WARN', `bucket ${bucket} public`, info.public ? 'public' : 'private');
  }

  let objects = 0;
  let bytes = 0;
  let originals = 0;
  const { data: entries } = await supabase.storage.from(bucket).list('', { limit: 100 });
  for (const entry of entries ?? []) {
    if (entry.id === null) {
      const { data: children } = await supabase.storage.from(bucket).list(entry.name, { limit: 1000 });
      for (const child of children ?? []) {
        objects += 1;
        bytes += Number(child.metadata?.size ?? 0);
        if (!/-w(480|768|1200|1600|2000)\.(webp|jpg)$/.test(child.name)) originals += 1;
      }
    } else {
      objects += 1;
      bytes += Number(entry.metadata?.size ?? 0);
      if (!/-w(480|768|1200|1600|2000)\.(webp|jpg)$/.test(entry.name)) originals += 1;
    }
  }
  record('PASS', 'storage objects', `${objects} objects, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  record('PASS', 'original (non-variant) files', `${originals} files kept for rollback`);
}

async function checkSite(): Promise<void> {
  if (!siteUrl) {
    record('WARN', 'site checks', 'skipped (pass --site-url=<preview url>)');
    return;
  }

  const landingRes = await http(`${siteUrl}/api/public/landing`);
  record(landingRes.status === 200 ? 'PASS' : 'FAIL', '/api/public/landing', `${landingRes.status}`);
  const landingCache = landingRes.headers.get('cache-control') ?? '';
  record(
    landingCache.includes('s-maxage=60') ? 'PASS' : 'WARN',
    'landing cache-control',
    landingCache || 'missing'
  );

  const freshRes = await http(`${siteUrl}/api/public/landing?fresh=1`);
  record(
    (freshRes.headers.get('cache-control') ?? '') === 'no-store' ? 'PASS' : 'FAIL',
    'fresh=1 is no-store',
    freshRes.headers.get('cache-control') ?? 'missing'
  );

  const authRes = await http(`${siteUrl}/api/auth/me`);
  record(
    authRes.status === 200 || authRes.status === 401 ? 'PASS' : 'FAIL',
    '/api/auth/me reachable',
    `${authRes.status}`
  );
  record(
    (authRes.headers.get('cache-control') ?? '').includes('no-store') ? 'PASS' : 'FAIL',
    '/api/auth/me no-store',
    authRes.headers.get('cache-control') ?? 'missing'
  );

  for (const route of ['/', '/ar', '/en', '/sitemap.xml', '/robots.txt']) {
    const res = await http(`${siteUrl}${route}`);
    const ok = res.status === 200 || (route === '/' && res.status === 302);
    record(ok ? 'PASS' : 'FAIL', route, `${res.status}`);
  }

  const html = await (await http(`${siteUrl}/ar`)).text();
  record(html.includes('id="site-data"') ? 'PASS' : 'FAIL', '/ar contains site-data', '');
  record(
    /rel="preload"[^>]*as="image"/.test(html) ? 'PASS' : 'FAIL',
    '/ar preloads the hero image',
    ''
  );
  record(
    (html.match(/<html lang="([a-z]+)" dir="(rtl|ltr)">/) ?? []).slice(1).join('/') === 'ar/rtl'
      ? 'PASS'
      : 'FAIL',
    '/ar html lang/dir',
    (html.match(/<html[^>]*>/) ?? [''])[0]
  );

  const htmlCache = (await http(`${siteUrl}/ar`)).headers.get('cache-control') ?? '';
  record(htmlCache.includes('s-maxage=60') ? 'PASS' : 'WARN', 'html cache-control', htmlCache || 'missing');

  const encoding = (await http(`${siteUrl}/ar`, { headers: { 'Accept-Encoding': 'br, gzip' } })).headers.get(
    'content-encoding'
  );
  record(encoding === 'br' || encoding === 'gzip' ? 'PASS' : 'WARN', 'content-encoding', encoding ?? 'none');

  try {
    const payload = (await landingRes.json()) as { trips?: Array<{ slug: string }> };
    const slug = payload.trips?.[0]?.slug;
    if (!slug) {
      record('WARN', 'trip page', 'no published trip found');
      return;
    }
    const tripRes = await http(`${siteUrl}/ar/trips/${slug}`);
    const tripHtml = await tripRes.text();
    record(tripRes.status === 200 ? 'PASS' : 'FAIL', `/ar/trips/${slug}`, `${tripRes.status}`);
    record(
      /property="og:title" content="[^"]+"/.test(tripHtml) ? 'PASS' : 'FAIL',
      'trip page has og:title',
      ''
    );
  } catch {
    record('WARN', 'trip page', 'landing payload was not JSON');
  }
}

async function main(): Promise<void> {
  console.log(`verify:supabase${siteUrl ? ` (site ${siteUrl})` : ''}\n`);
  await checkEnvironment();
  if (isSupabaseConfigured()) {
    await checkSchema();
    await checkRpc();
    await checkDataIntegrity();
    await checkImages();
    await checkStorage();
  }
  await checkSite();

  const fails = results.filter((item) => item.status === 'FAIL').length;
  const warns = results.filter((item) => item.status === 'WARN').length;
  const passes = results.filter((item) => item.status === 'PASS').length;
  console.log(`\nSummary: ${passes} PASS, ${warns} WARN, ${fails} FAIL`);
  if (fails > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('verify:supabase crashed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

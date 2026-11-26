import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { getStorageBucket, getSupabaseAdmin, getSupabaseUrl, isSupabaseConfigured } from '../server/supabase.ts';
import type { ImageVariants } from '../src/shared/types.ts';
import { planVariantWidths, variantFileName } from '../src/lib/image-variant.ts';
import { IMAGE_VARIANT_WIDTHS } from '../src/lib/image-url.ts';

/**
 * Local-only image optimiser. Never runs on Vercel / Lambda.
 *
 *   npm run optimize:images -- --seed-only --dry-run
 *   npm run optimize:images -- --seed-only
 *   npm run optimize:images -- --supabase --dry-run
 *   npm run optimize:images -- --supabase
 *
 * --seed-only   convert the bundled seed photos to WebP variants in public/assets/img
 *               and write docs/snapshots/seed-assets.json for the seed records.
 * --supabase    generate variants for existing image rows that have none and
 *               update images.variants / images.avg_color. Downloads only, then
 *               uploads new files; nothing in Storage is ever deleted and the old
 *               url stays on the row so a rollback is possible.
 * --dry-run     prints what would happen and writes nothing.
 */

const SEED_DIRS = ['src/assets/images', 'public/assets/aistudio'];
const SEED_OUT_DIR = 'public/assets/img';
const SEED_MANIFEST = 'docs/snapshots/seed-assets.json';
const REFERENCE_GLOB_DIRS = ['src', 'server'];
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const dryRun = process.argv.includes('--dry-run');
const seedOnly = process.argv.includes('--seed-only');
const supabaseMode = process.argv.includes('--supabase');
/**
 * Deletion is opt-in and only ever removes files that no source file references
 * any more, so a conversion never breaks the running app.
 */
const prune = process.argv.includes('--prune');

interface SeedEntry {
  source: string;
  baseName: string;
  width: number;
  height: number;
  variants: ImageVariants;
  avgColor: string;
  bytesBefore: number;
  bytesAfter: number;
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

function rootPath(...parts: string[]): string {
  return path.resolve(process.cwd(), ...parts);
}

function hexFromRgb(r: number, g: number, b: number): string {
  const part = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

async function averageColor(input: string | Buffer): Promise<string> {
  const { data } = await sharp(input).resize(1, 1, { fit: 'fill' }).removeAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  return hexFromRgb(data[0] ?? 0, data[1] ?? 0, data[2] ?? 0);
}

function listSeedSources(): string[] {
  const files: string[] = [];
  for (const dir of SEED_DIRS) {
    const absolute = rootPath(dir);
    if (!fs.existsSync(absolute)) continue;
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      files.push(path.join(dir, entry.name));
    }
  }
  return files.sort();
}

function referencedInCode(relativePath: string): boolean {
  const needle = toPosix(relativePath);
  const fileName = path.basename(relativePath);
  const haystack: string[] = [];
  for (const dir of REFERENCE_GLOB_DIRS) {
    collectTextFiles(rootPath(dir), haystack);
  }
  const indexHtml = rootPath('index.html');
  if (fs.existsSync(indexHtml)) haystack.push(fs.readFileSync(indexHtml, 'utf8'));

  return haystack.some((text) => text.includes(needle) || text.includes(fileName));
}

function collectTextFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTextFiles(full, out);
    } else if (/\.(ts|tsx|js|jsx|json|html|css|md)$/i.test(entry.name)) {
      out.push(fs.readFileSync(full, 'utf8'));
    }
  }
}

async function convertSeed(): Promise<{
  entries: SeedEntry[];
  skipped: string[];
  removed: string[];
  bytesBefore: number;
  bytesAfter: number;
}> {
  const entries: SeedEntry[] = [];
  const skipped: string[] = [];
  const removed: string[] = [];
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const relative of listSeedSources()) {
    const absolute = rootPath(relative);
    const stat = fs.statSync(absolute);
    bytesBefore += stat.size;

    // Deletion only happens with --prune and only when nothing references the file.
    if (!referencedInCode(relative)) {
      skipped.push(relative);
      if (prune && !dryRun) {
        fs.rmSync(absolute);
        removed.push(relative);
      }
      continue;
    }

    const metadata = await sharp(absolute).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const widths = planVariantWidths(width, IMAGE_VARIANT_WIDTHS);
    const baseName = path.basename(relative, path.extname(relative));
    const avgColor = await averageColor(absolute);

    if (widths.length === 0) {
      skipped.push(relative);
      continue;
    }

    // `basePath` is what the app stores on the image row: a public URL path,
    // without the leading "public/" and without the "-w<width>.webp" suffix.
    const basePath = `${SEED_OUT_DIR.replace(/^public\//, '')}/${baseName}`;
    let entryBytes = 0;
    for (const variantWidth of widths) {
      const outRelative = `public/${variantFileName(basePath, variantWidth, 'webp')}`;
      const outAbsolute = rootPath(outRelative);
      if (!dryRun) {
        fs.mkdirSync(path.dirname(outAbsolute), { recursive: true });
        await sharp(absolute)
          .rotate()
          .resize({ width: variantWidth, withoutEnlargement: true })
          .webp({ quality: 78 })
          .toFile(outAbsolute);
      }
      entryBytes += dryRun ? 0 : fs.statSync(outAbsolute).size;
    }

    bytesAfter += entryBytes;
    entries.push({
      source: relative,
      baseName,
      width,
      height,
      variants: { format: 'webp', widths, basePath },
      avgColor,
      bytesBefore: stat.size,
      bytesAfter: entryBytes,
    });

    if (prune && !dryRun && !referencedInCode(relative)) {
      fs.rmSync(absolute);
      removed.push(relative);
    }
  }

  if (!dryRun && entries.length > 0) {
    const manifestPath = rootPath(SEED_MANIFEST);
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  }

  return { entries, skipped, removed, bytesBefore, bytesAfter };
}

async function uploadVariantsToSupabase(): Promise<{
  converted: number;
  skipped: number;
  failed: number;
  bytesBefore: number;
  bytesAfter: number;
}> {
  const supabase = getSupabaseAdmin();
  const bucket = getStorageBucket();
  const summary = { converted: 0, skipped: 0, failed: 0, bytesBefore: 0, bytesAfter: 0 };

  const { data: rows, error } = await supabase
    .from('images')
    .select('id, provider, public_id, url, width, height, bytes, format, variants')
    .order('created_at', { ascending: true });
  if (error) {
    throw new Error(
      `Could not read images: ${error.message}\n` +
        'If the column "variants" is missing, apply supabase/migrations/0002_image_variants.sql first.'
    );
  }

  for (const row of rows ?? []) {
    const id = String(row.id);
    const publicId = String(row.public_id ?? '');
    const url = String(row.url ?? '');
    const provider = String(row.provider ?? '');
    summary.bytesBefore += Number(row.bytes ?? 0);

    if (row.variants) {
      summary.skipped += 1;
      continue;
    }
    if (!url) {
      summary.skipped += 1;
      continue;
    }

    try {
      const source = await downloadSource(url, provider);
      if (!source) {
        summary.skipped += 1;
        console.log(`  skip ${id}: source not reachable (${url})`);
        continue;
      }

      const metadata = await sharp(source).metadata();
      const width = metadata.width ?? Number(row.width ?? 0);
      const widths = planVariantWidths(width, IMAGE_VARIANT_WIDTHS);
      if (widths.length === 0) {
        summary.skipped += 1;
        console.log(`  skip ${id}: source too small (${width}px)`);
        continue;
      }

      const basePath = publicId.replace(/\.[a-z0-9]{2,5}$/i, '');
      const avgColor = await averageColor(source);
      let uploadedBytes = 0;

      for (const variantWidth of widths) {
        const objectPath = variantFileName(basePath, variantWidth, 'webp');
        const buffer = await sharp(source)
          .rotate()
          .resize({ width: variantWidth, withoutEnlargement: true })
          .webp({ quality: 78 })
          .toBuffer();
        uploadedBytes += buffer.length;

        if (dryRun) {
          console.log(`  plan ${id}: would upload ${objectPath} (${Math.round(buffer.length / 1024)} KB)`);
          continue;
        }

        const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: false,
        });
        if (uploadError && !/already exists/i.test(uploadError.message)) {
          throw new Error(`upload ${objectPath}: ${uploadError.message}`);
        }
      }

      const variants: ImageVariants = { format: 'webp', widths, basePath };
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('images')
          .update({ variants, avg_color: avgColor })
          .eq('id', id);
        if (updateError) throw new Error(`update row: ${updateError.message}`);
      }

      summary.bytesAfter += uploadedBytes;
      summary.converted += 1;
      console.log(
        `  ${dryRun ? 'plan' : 'ok  '} ${id}: ${widths.join('/')} webp, ` +
          `${Math.round(uploadedBytes / 1024)} KB (was ${Math.round(Number(row.bytes ?? 0) / 1024)} KB)`
      );
    } catch (err) {
      summary.failed += 1;
      console.error(`  fail ${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

async function downloadSource(url: string, provider: string): Promise<Buffer | null> {
  if (url.startsWith('/')) {
    const local = rootPath('public', url.replace(/^\//, ''));
    return fs.existsSync(local) ? fs.readFileSync(local) : null;
  }
  if (!/^https?:\/\//i.test(url)) return null;

  const headers: Record<string, string> = {};
  // Private bucket: sign the object path instead of depending on a public URL.
  if (provider === 'SUPABASE' && isSupabaseConfigured()) {
    const base = getSupabaseUrl() ?? '';
    const prefix = `${base}/storage/v1/object/public/${getStorageBucket()}/`;
    if (url.startsWith(prefix)) {
      const objectPath = url.slice(prefix.length);
      const { data } = await getSupabaseAdmin()
        .storage.from(getStorageBucket())
        .createSignedUrl(objectPath, 60);
      if (data?.signedUrl) {
        const signed = await fetch(data.signedUrl);
        return signed.ok ? Buffer.from(await signed.arrayBuffer()) : null;
      }
    }
  }

  const res = await fetch(url, { headers });
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

async function main(): Promise<void> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.error('optimize-images must run locally, never on Vercel/Lambda. Aborting.');
    process.exit(1);
  }

  const runSeed = seedOnly || !supabaseMode;
  const runSupabase = supabaseMode;

  if (!runSeed && !runSupabase) {
    console.error('Nothing to do. Pass --seed-only or --supabase.');
    process.exit(1);
  }

  console.log(`optimize-images${dryRun ? ' (dry run — nothing is written)' : ''}`);

  if (runSeed) {
    console.log('\n[seed] bundled assets -> public/assets/img');
    const seed = await convertSeed();
    console.log(
      `[seed] converted ${seed.entries.length}, skipped ${seed.skipped.length}, ` +
        `removed ${seed.removed.length}, ${kb(seed.bytesBefore)} -> ${kb(seed.bytesAfter)}`
    );
    for (const entry of seed.entries) {
      console.log(
        `  ${entry.baseName}: ${entry.variants.widths.join('/')} webp ` +
          `(${kb(entry.bytesBefore)} -> ${kb(entry.bytesAfter)})`
      );
    }
    for (const relative of seed.skipped) {
      console.log(`  skipped (unreferenced or unusable): ${relative}`);
    }
  }

  if (runSupabase) {
    if (!isSupabaseConfigured()) {
      console.error('\n[supabase] not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
      process.exit(1);
    }
    console.log('\n[supabase] generating variants for existing rows');
    const summary = await uploadVariantsToSupabase();
    console.log(
      `[supabase] converted ${summary.converted}, skipped ${summary.skipped}, failed ${summary.failed}, ` +
        `${kb(summary.bytesBefore)} -> ${kb(summary.bytesAfter)}`
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

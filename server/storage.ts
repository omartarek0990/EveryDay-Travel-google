import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ImageRecord } from '../src/shared/types.ts';
import { getStorageBucket, getSupabaseAdmin, getSupabaseUrl } from './supabase.ts';

export interface UploadSignatureResult {
  provider: 'SUPABASE' | 'CLOUDINARY' | 'STATIC';
  uploadUrl: string;
  fields: Record<string, string>;
}

export interface VerifiedImageMetadata {
  provider: 'SUPABASE' | 'CLOUDINARY' | 'STATIC';
  publicId: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

export interface ImageStorage {
  readonly provider: 'SUPABASE' | 'CLOUDINARY' | 'STATIC';
  signUpload(
    folder?: string,
    options?: { fileName?: string; mimeType?: string; key?: string }
  ): Promise<UploadSignatureResult>;
  verify(publicId: string): Promise<VerifiedImageMetadata>;
  /** True when the object exists in this storage provider. */
  exists(publicId: string): Promise<boolean>;
  destroy(publicId: string): Promise<void>;
  url(image: Pick<ImageRecord, 'provider' | 'publicId' | 'url'>, opts?: { width?: number }): string;
}

const IS_SERVERLESS_READONLY = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const LOCAL_UPLOAD_DIR = IS_SERVERLESS_READONLY
  ? path.join('/tmp', 'everyday-uploads')
  : path.resolve(process.cwd(), 'public', 'uploads');

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

function extensionFor(options?: { fileName?: string; mimeType?: string }): string {
  const mime = options?.mimeType?.toLowerCase() || '';
  if (MIME_TO_EXT[mime]) return MIME_TO_EXT[mime];
  const ext = options?.fileName?.split('.').pop()?.toLowerCase() || '';
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'jpg';
}

function sanitizeFolder(folder: string): string {
  return (
    folder
      .replace(/[^a-z0-9/_-]/gi, '')
      .replace(/^\/+|\/+$/g, '')
      .slice(0, 120) || 'everyday'
  );
}

/** Object keys proposed by the client (a random id plus a `-w<width>` suffix). */
export function sanitizeUploadKey(key: string | undefined): string | null {
  if (!key) return null;
  const cleaned = key.replace(/[^a-z0-9-]/gi, '').toLowerCase().slice(0, 80);
  return /^[a-z0-9][a-z0-9-]{5,79}$/.test(cleaned) ? cleaned : null;
}

/**
 * Storage object id of one responsive variant. Kept in sync with the URL rules
 * in src/lib/image-url.ts (Supabase: `<basePath>-w<w>.<format>`, static files:
 * `local/<key>-w<w>.<format>` served from `/uploads`).
 */
export function imageVariantObjectId(
  provider: ImageRecord['provider'],
  basePublicId: string,
  width: number,
  format: 'webp' | 'jpg'
): string {
  const base = basePublicId.replace(/\.[a-z0-9]{2,5}$/i, '');
  if (provider === 'STATIC') {
    return `local/${base.replace(/^local\//, '')}-w${width}.${format}`;
  }
  return `${base}-w${width}.${format}`;
}

/** `basePath` stored on the image row, used by the client to build variant URLs. */
export function imageVariantBasePath(
  provider: ImageRecord['provider'],
  basePublicId: string
): string {
  const base = basePublicId.replace(/\.[a-z0-9]{2,5}$/i, '');
  if (provider === 'STATIC') {
    return `uploads/${base.replace(/^local\//, '')}`;
  }
  return base;
}

function getUploadTokenSecret(): string {
  return process.env.SESSION_SECRET || globalThis.__everydayUploadSecret || (globalThis.__everydayUploadSecret = crypto.randomBytes(32).toString('hex'));
}

declare global {
  var __everydayUploadSecret: string | undefined;
}

class SupabaseStorage implements ImageStorage {
  readonly provider = 'SUPABASE' as const;

  async signUpload(
    folder = 'everyday',
    options?: { fileName?: string; mimeType?: string; key?: string }
  ): Promise<UploadSignatureResult> {
    const bucket = getStorageBucket();
    const key = sanitizeUploadKey(options?.key) ?? crypto.randomUUID();
    const objectPath = `${sanitizeFolder(folder)}/${key}.${extensionFor(options)}`;
    const { data, error } = await getSupabaseAdmin()
      .storage.from(bucket)
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      throw new Error(`Failed to sign Supabase upload: ${error?.message ?? 'unknown error'}`);
    }

    const baseUrl = getSupabaseUrl() ?? '';
    const uploadUrl = /^https?:\/\//i.test(data.signedUrl)
      ? data.signedUrl
      : `${baseUrl}${data.signedUrl.startsWith('/') ? '' : '/'}${data.signedUrl}`;

    return {
      provider: 'SUPABASE',
      uploadUrl,
      fields: {
        path: data.path ?? objectPath,
        token: data.token,
        bucket,
      },
    };
  }

  async verify(publicId: string): Promise<VerifiedImageMetadata> {
    const bucket = getStorageBucket();
    const supabase = getSupabaseAdmin();
    const slash = publicId.lastIndexOf('/');
    const dir = slash >= 0 ? publicId.slice(0, slash) : '';
    const name = slash >= 0 ? publicId.slice(slash + 1) : publicId;

    const { data, error } = await supabase.storage.from(bucket).list(dir, {
      search: name,
      limit: 100,
    });
    if (error) {
      throw new Error(`Failed to verify Supabase upload: ${error.message}`);
    }

    const file = (data ?? []).find((item) => item.name === name);
    if (!file) {
      throw new Error('Uploaded file not found in Supabase Storage');
    }

    const metadata = (file.metadata ?? {}) as {
      size?: number;
      contentLength?: number;
      mimetype?: string;
    };

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(publicId);
    const format =
      MIME_TO_EXT[metadata.mimetype?.toLowerCase() ?? ''] ||
      name.split('.').pop()?.toLowerCase() ||
      'jpg';

    return {
      provider: 'SUPABASE',
      publicId,
      url: publicData.publicUrl,
      width: 1600,
      height: 1200,
      bytes: metadata.size ?? metadata.contentLength ?? 0,
      format,
    };
  }

  async destroy(publicId: string): Promise<void> {
    if (publicId.startsWith('seed/') || publicId.startsWith('local/')) return;
    const { error } = await getSupabaseAdmin().storage.from(getStorageBucket()).remove([publicId]);
    if (error) {
      console.error(`[ImageStorage] Supabase remove failed for ${publicId}: ${error.message}`);
    }
  }

  async exists(publicId: string): Promise<boolean> {
    const bucket = getStorageBucket();
    const slash = publicId.lastIndexOf('/');
    const dir = slash >= 0 ? publicId.slice(0, slash) : '';
    const name = slash >= 0 ? publicId.slice(slash + 1) : publicId;
    const { data, error } = await getSupabaseAdmin()
      .storage.from(bucket)
      .list(dir, { search: name, limit: 100 });
    if (error) {
      console.error(`[ImageStorage] Supabase exists check failed for ${publicId}: ${error.message}`);
      return false;
    }
    return (data ?? []).some((item) => item.name === name);
  }

  url(image: Pick<ImageRecord, 'provider' | 'publicId' | 'url'>): string {
    return image.url;
  }
}

class CloudinaryStorage implements ImageStorage {
  readonly provider = 'CLOUDINARY' as const;

  private get config() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    const apiKey = process.env.CLOUDINARY_API_KEY!;
    const apiSecret = process.env.CLOUDINARY_API_SECRET!;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET!;
    return { cloudName, apiKey, apiSecret, uploadPreset };
  }

  async signUpload(folder = 'everyday'): Promise<UploadSignatureResult> {
    const { cloudName, apiKey, apiSecret, uploadPreset } = this.config;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign: Record<string, string> = {
      folder,
      timestamp,
      upload_preset: uploadPreset,
    };

    const sortedString = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join('&');

    const signature = crypto
      .createHash('sha1')
      .update(`${sortedString}${apiSecret}`)
      .digest('hex');

    return {
      provider: 'CLOUDINARY',
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      fields: {
        api_key: apiKey,
        timestamp,
        folder,
        upload_preset: uploadPreset,
        signature,
      },
    };
  }

  async verify(publicId: string): Promise<VerifiedImageMetadata> {
    const { cloudName, apiKey, apiSecret } = this.config;
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${encodeURIComponent(publicId)}`;

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`Cloudinary verification failed (${res.status})`);
    }
    const data = (await res.json()) as {
      public_id: string;
      secure_url: string;
      width: number;
      height: number;
      bytes: number;
      format: string;
    };

    return {
      provider: 'CLOUDINARY',
      publicId: data.public_id,
      url: data.secure_url,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
      format: data.format,
    };
  }

  async destroy(publicId: string): Promise<void> {
    if (publicId.startsWith('seed/') || publicId.startsWith('local/')) return;
    const { cloudName, apiKey, apiSecret } = this.config;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    const body = new URLSearchParams({
      public_id: publicId,
      timestamp,
      api_key: apiKey,
      signature,
    });

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.error(`[ImageStorage] Cloudinary destroy failed for ${publicId}: ${res.status}`);
      }
    } catch (err) {
      console.error(`[ImageStorage] Cloudinary destroy error for ${publicId}:`, err);
    }
  }

  /** Cloudinary URLs are transformed on the fly, so the app never stores variants there. */
  async exists(): Promise<boolean> {
    return false;
  }

  url(image: Pick<ImageRecord, 'provider' | 'publicId' | 'url'>, opts?: { width?: number }): string {
    if (image.provider !== 'CLOUDINARY') return image.url;
    const { cloudName } = this.config;
    const width = opts?.width ? Math.min(2560, Math.max(200, Math.round(opts.width))) : 1200;
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_fill,g_auto,w_${width}/${image.publicId}`;
  }
}

class StaticStorage implements ImageStorage {
  readonly provider = 'STATIC' as const;

  async signUpload(
    folder = 'everyday',
    options?: { fileName?: string; mimeType?: string; key?: string }
  ): Promise<UploadSignatureResult> {
    const exp = String(Date.now() + 5 * 60 * 1000);
    const nonce = crypto.randomBytes(12).toString('hex');
    const key = sanitizeUploadKey(options?.key);
    const sig = crypto
      .createHmac('sha256', getUploadTokenSecret())
      .update(`${folder}:${key ?? ''}:${exp}:${nonce}`)
      .digest('hex');

    return {
      provider: 'STATIC',
      uploadUrl: '/api/uploads/local',
      fields: {
        folder,
        exp,
        nonce,
        signature: sig,
        ...(key ? { key } : {}),
      },
    };
  }

  verifyUploadSignature(fields: {
    folder: string;
    exp: string;
    nonce: string;
    signature: string;
    key?: string;
  }): boolean {
    const expNum = Number(fields.exp);
    if (!Number.isFinite(expNum) || Date.now() > expNum) return false;
    const expected = crypto
      .createHmac('sha256', getUploadTokenSecret())
      .update(`${fields.folder}:${fields.key ?? ''}:${fields.exp}:${fields.nonce}`)
      .digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(fields.signature || '', 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async exists(publicId: string): Promise<boolean> {
    if (!publicId.startsWith('local/')) return false;
    const resolved = path.resolve(LOCAL_UPLOAD_DIR, publicId.slice('local/'.length));
    return resolved.startsWith(LOCAL_UPLOAD_DIR + path.sep) && fs.existsSync(resolved);
  }

  async verify(publicId: string): Promise<VerifiedImageMetadata> {
    if (!publicId.startsWith('local/')) {
      throw new Error('Invalid local publicId');
    }
    const fileName = publicId.slice('local/'.length);
    const resolved = path.resolve(LOCAL_UPLOAD_DIR, fileName);
    if (!resolved.startsWith(LOCAL_UPLOAD_DIR + path.sep) || !fs.existsSync(resolved)) {
      throw new Error('Uploaded file not found');
    }
    const stat = fs.statSync(resolved);
    const ext = path.extname(fileName).replace('.', '').toLowerCase() || 'jpg';
    return {
      provider: 'STATIC',
      publicId,
      url: `/uploads/${fileName}`,
      width: 1600,
      height: 1200,
      bytes: stat.size,
      format: ext,
    };
  }

  async destroy(publicId: string): Promise<void> {
    if (!publicId.startsWith('local/')) return;
    const fileName = publicId.slice('local/'.length);
    const resolved = path.resolve(LOCAL_UPLOAD_DIR, fileName);
    if (!resolved.startsWith(LOCAL_UPLOAD_DIR + path.sep)) return;
    try {
      if (fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    } catch (err) {
      console.error(`[ImageStorage] Static destroy error for ${publicId}:`, err);
    }
  }

  url(image: Pick<ImageRecord, 'provider' | 'publicId' | 'url'>): string {
    return image.url;
  }
}

export const staticStorage = new StaticStorage();

export function getImageStorage(): ImageStorage {
  const preference = process.env.IMAGE_STORAGE?.trim().toLowerCase();

  const hasSupabase = Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
  const hasCloudinary =
    Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET) &&
    Boolean(process.env.CLOUDINARY_UPLOAD_PRESET);

  if (preference === 'cloudinary' && hasCloudinary) return new CloudinaryStorage();
  if (preference === 'static') return staticStorage;
  if (preference === 'supabase') return new SupabaseStorage();
  if (hasSupabase) return new SupabaseStorage();
  if (hasCloudinary) return new CloudinaryStorage();
  return staticStorage;
}

export function ensureLocalUploadDir(): string {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
  return LOCAL_UPLOAD_DIR;
}

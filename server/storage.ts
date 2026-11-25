import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ImageRecord } from '../src/shared/types.ts';

export interface UploadSignatureResult {
  provider: 'CLOUDINARY' | 'STATIC';
  uploadUrl: string;
  fields: Record<string, string>;
}

export interface VerifiedImageMetadata {
  provider: 'CLOUDINARY' | 'STATIC';
  publicId: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

export interface ImageStorage {
  readonly provider: 'CLOUDINARY' | 'STATIC';
  signUpload(folder?: string): UploadSignatureResult;
  verify(publicId: string): Promise<VerifiedImageMetadata>;
  destroy(publicId: string): Promise<void>;
  url(image: Pick<ImageRecord, 'provider' | 'publicId' | 'url'>, opts?: { width?: number }): string;
}

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');

function getUploadTokenSecret(): string {
  return process.env.SESSION_SECRET || globalThis.__everydayUploadSecret || (globalThis.__everydayUploadSecret = crypto.randomBytes(32).toString('hex'));
}

declare global {
  var __everydayUploadSecret: string | undefined;
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

  signUpload(folder = 'everyday'): UploadSignatureResult {
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

  url(image: Pick<ImageRecord, 'provider' | 'publicId' | 'url'>, opts?: { width?: number }): string {
    if (image.provider !== 'CLOUDINARY') return image.url;
    const { cloudName } = this.config;
    const width = opts?.width ? Math.min(2560, Math.max(200, Math.round(opts.width))) : 1200;
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_fill,g_auto,w_${width}/${image.publicId}`;
  }
}

class StaticStorage implements ImageStorage {
  readonly provider = 'STATIC' as const;

  signUpload(folder = 'everyday'): UploadSignatureResult {
    const exp = String(Date.now() + 5 * 60 * 1000);
    const nonce = crypto.randomBytes(12).toString('hex');
    const sig = crypto
      .createHmac('sha256', getUploadTokenSecret())
      .update(`${folder}:${exp}:${nonce}`)
      .digest('hex');

    return {
      provider: 'STATIC',
      uploadUrl: '/api/uploads/local',
      fields: {
        folder,
        exp,
        nonce,
        signature: sig,
      },
    };
  }

  verifyUploadSignature(fields: { folder: string; exp: string; nonce: string; signature: string }): boolean {
    const expNum = Number(fields.exp);
    if (!Number.isFinite(expNum) || Date.now() > expNum) return false;
    const expected = crypto
      .createHmac('sha256', getUploadTokenSecret())
      .update(`${fields.folder}:${fields.exp}:${fields.nonce}`)
      .digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(fields.signature || '', 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
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
  const hasCloudinary =
    Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET) &&
    Boolean(process.env.CLOUDINARY_UPLOAD_PRESET);

  if (hasCloudinary) {
    return new CloudinaryStorage();
  }
  return staticStorage;
}

export function ensureLocalUploadDir(): string {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
  return LOCAL_UPLOAD_DIR;
}

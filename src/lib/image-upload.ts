import type { ImageVariantFormat, ImageRecord } from '../shared/types';
import { planVariantWidths, pickVariantFormat, supportsWebpEncoding, variantMimeType, VARIANT_JPEG_QUALITY, VARIANT_QUALITY } from './image-variant';

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION = 2560;
/** Long-lived cache for immutable, content-unique upload paths. */
const IMMUTABLE_CACHE_CONTROL = 'max-age=31536000';

export function validateImageFile(file: File): string | null {
  const type = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isAllowedByExt = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext);
  if (!ALLOWED_IMAGE_TYPES.has(type) && !isAllowedByExt) {
    return 'صيغة الصورة غير مدعومة. المسموح: JPEG, PNG, WebP, HEIC';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'حجم الصورة يتجاوز 25 ميجابايت';
  }
  return null;
}

export async function downscaleImageInBrowser(
  file: File
): Promise<{ blob: Blob; width: number; height: number; mimeType: string }> {
  try {
    // createImageBitmap applies EXIF orientation in modern browsers automatically
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const origW = bitmap.width;
    const origH = bitmap.height;
    const maxSide = Math.max(origW, origH);

    let targetW = origW;
    let targetH = origH;
    if (maxSide > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / maxSide;
      targetW = Math.round(origW * scale);
      targetH = Math.round(origH * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return { blob: file, width: origW, height: origH, mimeType: file.type || 'image/jpeg' };
    }

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const outputMime =
      file.type === 'image/png'
        ? 'image/png'
        : file.type === 'image/webp'
          ? 'image/webp'
          : 'image/jpeg';

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputMime, 0.9)
    );
    if (!blob) {
      return { blob: file, width: origW, height: origH, mimeType: file.type || 'image/jpeg' };
    }

    return { blob, width: targetW, height: targetH, mimeType: outputMime };
  } catch {
    // Browser cannot decode HEIC or other exotic format -> upload original untouched
    return {
      blob: file,
      width: 1600,
      height: 1200,
      mimeType: file.type || 'image/heic',
    };
  }
}

export interface GeneratedImageVariants {
  format: ImageVariantFormat;
  variants: Array<{ width: number; height: number; blob: Blob }>;
  avgColor: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  const part = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/**
 * Encodes the responsive WebP variants (JPEG when the browser has no WebP
 * encoder). Variants are encoded one at a time to keep phone memory bounded.
 * Returns null when the file cannot be decoded (e.g. HEIC), so the caller can
 * fall back to uploading the original exactly as before.
 */
export async function createImageVariants(source: Blob): Promise<GeneratedImageVariants | null> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
    const widths = planVariantWidths(bitmap.width);
    if (widths.length === 0) return null;

    const format = pickVariantFormat(supportsWebpEncoding());
    const mimeType = variantMimeType(format);
    const quality = format === 'webp' ? VARIANT_QUALITY : VARIANT_JPEG_QUALITY;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Average color for the loading placeholder, computed from a 1x1 draw.
    canvas.width = 1;
    canvas.height = 1;
    ctx.drawImage(bitmap, 0, 0, 1, 1);
    const pixel = ctx.getImageData(0, 0, 1, 1).data;
    const avgColor = rgbToHex(pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0);

    const variants: GeneratedImageVariants['variants'] = [];
    for (const width of widths) {
      const height = Math.max(1, Math.round((bitmap.height / bitmap.width) * width));
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mimeType, quality)
      );
      if (blob) variants.push({ width, height, blob });
      // Free the bitmap backing store before the next (larger) draw.
      canvas.width = 0;
      canvas.height = 0;
    }

    return variants.length > 0 ? { format, variants, avgColor } : null;
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

interface SignedUpload {
  provider: 'SUPABASE' | 'CLOUDINARY' | 'STATIC';
  uploadUrl: string;
  fields: Record<string, string>;
}

function createUploadKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

async function requestSignature(opts: {
  folder: string;
  fileName: string;
  mimeType: string;
  key: string;
  headers: Record<string, string>;
  signal: AbortSignal;
}): Promise<SignedUpload> {
  const res = await fetch('/api/uploads/sign', {
    method: 'POST',
    headers: { ...opts.headers, 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      folder: opts.folder,
      fileName: opts.fileName,
      mimeType: opts.mimeType,
      key: opts.key,
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'تعذر بدء رفع الصورة');
  }
  return (await res.json()) as SignedUpload;
}

/** Uploads one blob to the signed destination, reporting 0-100 progress. */
function putSigned(
  signed: SignedUpload,
  payload: {
    blob: Blob;
    mimeType: string;
    fileName: string;
    authToken?: string | null;
    width?: number;
    height?: number;
  },
  onProgress: (percent: number) => void,
  signal: AbortSignal
): Promise<string> {
  const { blob, mimeType, fileName, authToken, width, height } = payload;

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal.addEventListener('abort', onAbort, { once: true });

    const cleanup = () => signal.removeEventListener('abort', onAbort);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress(Math.min(100, Math.round((ev.loaded / ev.total) * 100)));
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        if (signed.provider === 'SUPABASE') {
          resolve(signed.fields.path);
          return;
        }
        try {
          const parsed = JSON.parse(xhr.responseText) as { public_id: string };
          resolve(parsed.public_id);
        } catch {
          reject(new Error('استجابة رفع غير صالحة'));
        }
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText) as { error?: string; message?: string };
          reject(new Error(parsed.error || parsed.message || 'فشل رفع الصورة'));
        } catch {
          reject(new Error('فشل رفع الصورة'));
        }
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error('تعذر الاتصال بخادم الصور'));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signed.provider === 'CLOUDINARY') {
      const formData = new FormData();
      formData.append('file', blob, fileName);
      Object.entries(signed.fields).forEach(([k, v]) => formData.append(k, v));
      xhr.open('POST', signed.uploadUrl);
      xhr.send(formData);
    } else if (signed.provider === 'SUPABASE') {
      const uploadUrl = new URL(signed.uploadUrl, window.location.origin);
      if (!uploadUrl.searchParams.has('token') && signed.fields.token) {
        uploadUrl.searchParams.set('token', signed.fields.token);
      }
      xhr.open('PUT', uploadUrl.toString());
      xhr.setRequestHeader('Content-Type', mimeType);
      xhr.setRequestHeader('Cache-Control', IMMUTABLE_CACHE_CONTROL);
      xhr.send(blob);
    } else {
      xhr.open('POST', signed.uploadUrl);
      xhr.withCredentials = true;
      if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
      xhr.setRequestHeader('Content-Type', mimeType);
      xhr.setRequestHeader('X-Upload-Folder', signed.fields.folder);
      xhr.setRequestHeader('X-Upload-Exp', signed.fields.exp);
      xhr.setRequestHeader('X-Upload-Nonce', signed.fields.nonce);
      xhr.setRequestHeader('X-Upload-Signature', signed.fields.signature);
      if (signed.fields.key) xhr.setRequestHeader('X-Upload-Key', signed.fields.key);
      if (width) xhr.setRequestHeader('X-Upload-Width', String(width));
      if (height) xhr.setRequestHeader('X-Upload-Height', String(height));
      xhr.send(blob);
    }
  });
}

export async function uploadImageWithProgress(opts: {
  file: File;
  folder?: string;
  authToken?: string | null;
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}): Promise<ImageRecord> {
  const { file, folder = 'everyday', authToken, onProgress, signal } = opts;

  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  // A single base name keeps every variant of one upload together and unique.
  const key = createUploadKey();

  // 1. Light browser downscale (the original file we keep for compatibility)
  onProgress(4);
  const prepared = await downscaleImageInBrowser(file);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  // 2. Original upload
  const baseSigned = await requestSignature({
    folder,
    fileName: file.name,
    mimeType: prepared.mimeType,
    key,
    headers,
    signal,
  });
  const uploadedPublicId = await putSigned(
    baseSigned,
    {
      blob: prepared.blob,
      mimeType: prepared.mimeType,
      fileName: file.name,
      authToken,
      width: prepared.width,
      height: prepared.height,
    },
    (percent) => onProgress(4 + Math.round(percent * 0.36)),
    signal
  );

  // 3. Responsive variants (best effort: a failure never blocks the upload).
  //    Cloudinary transforms on the fly, so it never gets variant uploads.
  let variants: { format: ImageVariantFormat; widths: number[] } | null = null;
  let avgColor: string | null = null;
  onProgress(42);
  if (baseSigned.provider !== 'CLOUDINARY') {
    try {
      // Encode from the already downscaled blob so a 6000px phone photo is
      // decoded once at <=2560px instead of once per variant.
      const generated = await createImageVariants(prepared.blob);
      if (generated) {
        const uploadedWidths: number[] = [];
        const variantMime = variantMimeType(generated.format);
        for (let index = 0; index < generated.variants.length; index += 1) {
          const variant = generated.variants[index];
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
          const signed = await requestSignature({
            folder,
            fileName: `${file.name}.${generated.format}`,
            mimeType: variantMime,
            key: `${key}-w${variant.width}`,
            headers,
            signal,
          });
          await putSigned(
            signed,
            {
              blob: variant.blob,
              mimeType: variantMime,
              fileName: `${variant.width}.${generated.format}`,
              authToken,
              width: variant.width,
              height: variant.height,
            },
            (percent) =>
              onProgress(
                42 + Math.round(((index + percent / 100) / generated.variants.length) * 50)
              ),
            signal
          );
          uploadedWidths.push(variant.width);
        }
        if (uploadedWidths.length > 0) {
          variants = { format: generated.format, widths: uploadedWidths };
          avgColor = generated.avgColor;
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      // Keep the successfully uploaded original; the app falls back to a single URL.
      console.warn(
        'Image variants could not be generated; falling back to the original image.',
        err
      );
      variants = null;
    }
  }

  // 4. Verify asset on server and persist Image row
  onProgress(95);
  const verifyRes = await fetch('/api/uploads/verify', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      publicId: uploadedPublicId,
      widthHint: prepared.width,
      heightHint: prepared.height,
      avgColor,
      variants,
    }),
    signal,
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.error || 'فشل التحقق من الصورة');
  }

  const verified = (await verifyRes.json()) as { image: ImageRecord };
  onProgress(100);
  return verified.image;
}

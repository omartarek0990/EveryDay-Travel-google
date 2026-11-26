import type { ImageRecord } from '../shared/types';

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

export async function uploadImageWithProgress(opts: {
  file: File;
  folder?: string;
  authToken?: string | null;
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}): Promise<ImageRecord> {
  const { file, folder = 'everyday', authToken, onProgress, signal } = opts;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  // 1. Light browser downscale
  onProgress(5);
  const prepared = await downscaleImageInBrowser(file);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  // 2. Request upload signature from server
  const signRes = await fetch('/api/uploads/sign', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ folder, fileName: file.name, mimeType: prepared.mimeType }),
    signal,
  });
  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.error || 'تعذر بدء رفع الصورة');
  }
  const signData = (await signRes.json()) as {
    provider: 'SUPABASE' | 'CLOUDINARY' | 'STATIC';
    uploadUrl: string;
    fields: Record<string, string>;
  };

  // 3. Direct upload via XHR for real progress tracking
  const uploadedPublicId = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal.addEventListener('abort', onAbort, { once: true });

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.min(90, Math.max(10, Math.round((ev.loaded / ev.total) * 85) + 5));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      signal.removeEventListener('abort', onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        if (signData.provider === 'SUPABASE') {
          resolve(signData.fields.path);
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
      signal.removeEventListener('abort', onAbort);
      reject(new Error('تعذر الاتصال بخادم الصور'));
    };

    xhr.onabort = () => {
      signal.removeEventListener('abort', onAbort);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signData.provider === 'CLOUDINARY') {
      const formData = new FormData();
      formData.append('file', prepared.blob, file.name);
      Object.entries(signData.fields).forEach(([k, v]) => formData.append(k, v));
      xhr.open('POST', signData.uploadUrl);
      xhr.send(formData);
    } else if (signData.provider === 'SUPABASE') {
      const uploadUrl = new URL(signData.uploadUrl, window.location.origin);
      if (!uploadUrl.searchParams.has('token') && signData.fields.token) {
        uploadUrl.searchParams.set('token', signData.fields.token);
      }
      xhr.open('PUT', uploadUrl.toString());
      xhr.setRequestHeader('Content-Type', prepared.mimeType);
      xhr.send(prepared.blob);
    } else {
      xhr.open('POST', signData.uploadUrl);
      xhr.withCredentials = true;
      if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
      xhr.setRequestHeader('Content-Type', prepared.mimeType);
      xhr.setRequestHeader('X-Upload-Folder', signData.fields.folder);
      xhr.setRequestHeader('X-Upload-Exp', signData.fields.exp);
      xhr.setRequestHeader('X-Upload-Nonce', signData.fields.nonce);
      xhr.setRequestHeader('X-Upload-Signature', signData.fields.signature);
      xhr.setRequestHeader('X-Upload-Width', String(prepared.width));
      xhr.setRequestHeader('X-Upload-Height', String(prepared.height));
      xhr.send(prepared.blob);
    }
  });

  // 4. Verify asset on server and persist Image row
  onProgress(95);
  const verifyRes = await fetch('/api/uploads/verify', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      publicId: uploadedPublicId,
      widthHint: prepared.width,
      heightHint: prepared.height,
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

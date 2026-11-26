import { describe, expect, it } from 'vitest';
import {
  imageVariantBasePath,
  imageVariantObjectId,
  sanitizeUploadKey,
  staticStorage,
} from './storage.ts';

describe('image variant paths', () => {
  it('maps Supabase object ids to the public base path', () => {
    expect(imageVariantObjectId('SUPABASE', 'everyday/abc.jpg', 768, 'webp')).toBe(
      'everyday/abc-w768.webp'
    );
    expect(imageVariantBasePath('SUPABASE', 'everyday/abc.jpg')).toBe('everyday/abc');
  });

  it('maps static uploads to /uploads urls', () => {
    expect(imageVariantObjectId('STATIC', 'local/abc.png', 480, 'jpg')).toBe(
      'local/abc-w480.jpg'
    );
    expect(imageVariantBasePath('STATIC', 'local/abc.png')).toBe('uploads/abc');
  });
});

describe('sanitizeUploadKey', () => {
  it('accepts uuids and variant suffixes', () => {
    expect(sanitizeUploadKey('3f8a1c2e-4b5d-4f60-9a1b-2c3d4e5f6a7b')).toBe(
      '3f8a1c2e-4b5d-4f60-9a1b-2c3d4e5f6a7b'
    );
    expect(sanitizeUploadKey('3f8a1c2e-w768')).toBe('3f8a1c2e-w768');
  });

  it('rejects path traversal and short keys', () => {
    expect(sanitizeUploadKey('../../etc/passwd')).toBe('etcpasswd');
    expect(sanitizeUploadKey('../../etc/passwd')).not.toBeNull();
    expect(sanitizeUploadKey('ab')).toBeNull();
    expect(sanitizeUploadKey('')).toBeNull();
    expect(sanitizeUploadKey(undefined)).toBeNull();
  });
});

describe('static upload signatures', () => {
  it('accepts a signature that covers the object key', async () => {
    const signed = await staticStorage.signUpload('everyday', { key: 'abc-123-def' });
    expect(signed.fields.key).toBe('abc-123-def');
    expect(
      staticStorage.verifyUploadSignature({
        folder: signed.fields.folder,
        exp: signed.fields.exp,
        nonce: signed.fields.nonce,
        signature: signed.fields.signature,
        key: signed.fields.key,
      })
    ).toBe(true);
  });

  it('rejects a changed key or a missing signature', async () => {
    const signed = await staticStorage.signUpload('everyday', { key: 'abc-123-def' });
    expect(
      staticStorage.verifyUploadSignature({
        folder: signed.fields.folder,
        exp: signed.fields.exp,
        nonce: signed.fields.nonce,
        signature: signed.fields.signature,
        key: 'other-456-ghi',
      })
    ).toBe(false);
    expect(
      staticStorage.verifyUploadSignature({
        folder: signed.fields.folder,
        exp: signed.fields.exp,
        nonce: signed.fields.nonce,
        signature: '',
      })
    ).toBe(false);
  });

  it('stays valid for legacy clients that send no key', async () => {
    const signed = await staticStorage.signUpload('everyday');
    expect(signed.fields.key).toBeUndefined();
    expect(
      staticStorage.verifyUploadSignature({
        folder: signed.fields.folder,
        exp: signed.fields.exp,
        nonce: signed.fields.nonce,
        signature: signed.fields.signature,
      })
    ).toBe(true);
  });
});

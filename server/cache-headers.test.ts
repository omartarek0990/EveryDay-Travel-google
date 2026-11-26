import { describe, expect, it } from 'vitest';
import {
  NO_STORE,
  PUBLIC_CACHE_CONTROL,
  applyApiCacheHeaders,
  cacheControlForRequest,
} from './cache-headers.ts';

describe('API cache headers', () => {
  it('caches the public payload at the edge for 60 s', () => {
    expect(cacheControlForRequest('/api/public/site')).toBe(PUBLIC_CACHE_CONTROL);
  });

  it('bypasses the cache for the admin refresh', () => {
    expect(cacheControlForRequest('/api/public/site', { fresh: '1' })).toBe(NO_STORE);
    expect(cacheControlForRequest('/api/public/site', { fresh: '0' })).toBe(PUBLIC_CACHE_CONTROL);
  });

  it('never caches auth, admin or upload routes', () => {
    expect(cacheControlForRequest('/api/auth/me')).toBe(NO_STORE);
    expect(cacheControlForRequest('/api/auth/login')).toBe(NO_STORE);
    expect(cacheControlForRequest('/api/admin/data')).toBe(NO_STORE);
    expect(cacheControlForRequest('/api/uploads/sign')).toBe(NO_STORE);
  });

  it('leaves unrelated routes untouched', () => {
    expect(cacheControlForRequest('/robots.txt')).toBeNull();
    expect(cacheControlForRequest('/sitemap.xml')).toBeNull();
  });

  it('sets the header through express middleware', () => {
    const headers: Record<string, string> = {};
    const res = { setHeader: (key: string, value: string) => { headers[key] = value; } };
    let called = false;

    applyApiCacheHeaders(
      { path: '/api/public/site', query: {} } as never,
      res as never,
      (() => { called = true; }) as never
    );

    expect(headers['Cache-Control']).toBe(PUBLIC_CACHE_CONTROL);
    expect(called).toBe(true);
  });
});

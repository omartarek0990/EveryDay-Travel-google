import type { NextFunction, Request, Response } from 'express';

/** Edge cache for the public payload: 60 s, serving stale for 10 min while revalidating. */
export const PUBLIC_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=600';
export const NO_STORE = 'no-store';

/**
 * Cache-Control for an API request.
 *
 * - `/api/public/*` is CDN-cached for 60 s, except the admin refresh (`?fresh=1`)
 *   which must always hit the origin so saved edits are visible immediately.
 * - Everything else under `/api` is private and must never be cached.
 */
export function cacheControlForRequest(
  path: string,
  query: Record<string, unknown> = {}
): string | null {
  const fresh = query.fresh === '1' || query.fresh === 1;

  if (path.startsWith('/api/public/')) {
    return fresh ? NO_STORE : PUBLIC_CACHE_CONTROL;
  }
  if (
    path.startsWith('/api/auth/') ||
    path.startsWith('/api/admin/') ||
    path.startsWith('/api/uploads/')
  ) {
    return NO_STORE;
  }
  return null;
}

export function applyApiCacheHeaders(req: Request, res: Response, next: NextFunction): void {
  const value = cacheControlForRequest(req.path, req.query as Record<string, unknown>);
  if (value) {
    res.setHeader('Cache-Control', value);
  }
  next();
}

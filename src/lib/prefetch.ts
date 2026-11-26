/**
 * Warms the trip detail chunk once, from the landing page (idle, hover or focus).
 * The same module specifier is used by the lazy route, so Vite serves the same
 * chunk and the browser dedupes the request.
 */
let tripDetailChunk: Promise<unknown> | null = null;

export function prefetchTripDetail(): void {
  if (typeof window === 'undefined') return;
  if (!tripDetailChunk) {
    tripDetailChunk = import('../pages/public/TripDetailPage').catch(() => {
      tripDetailChunk = null;
    });
  }
}

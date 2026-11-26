import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  PublicLandingPayload,
  TripWithRelations,
} from '../shared/types';

interface RefreshOptions {
  /** Admin path: bypass the edge cache so saved edits show immediately. */
  fresh?: boolean;
}

interface PublicDataContextValue {
  data: PublicLandingPayload | null;
  loading: boolean;
  error: string | null;
  refresh: (options?: RefreshOptions) => Promise<void>;
}

const PublicDataContext = createContext<PublicDataContextValue | null>(null);

interface InjectedSiteData extends PublicLandingPayload {
  trip?: TripWithRelations;
}

/** Reads the payload injected by the server into <script id="site-data">. */
export function readInjectedSiteData(): InjectedSiteData | null {
  if (typeof document === 'undefined') return null;
  const element = document.getElementById('site-data');
  const raw = element?.textContent;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InjectedSiteData;
    return parsed && parsed.settings ? parsed : null;
  } catch {
    return null;
  }
}

/** The full trip injected for a trip route, when it matches the requested slug. */
export function readInjectedTrip(slug: string | undefined): TripWithRelations | null {
  if (!slug) return null;
  const injected = readInjectedSiteData();
  const trip = injected?.trip;
  return trip && trip.slug === slug ? trip : null;
}

export function PublicDataProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState<InjectedSiteData | null>(() => readInjectedSiteData());
  const [data, setData] = useState<PublicLandingPayload | null>(initial);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: RefreshOptions) => {
    try {
      // The normal path is served from the CDN (s-maxage=60); the admin path
      // appends fresh=1 so the server answers with no-store and current data.
      const res = await fetch(
        options?.fresh ? '/api/public/landing?fresh=1' : '/api/public/landing',
        { ...(options?.fresh ? { cache: 'no-store' as RequestCache } : {}) }
      );
      if (!res.ok) throw new Error('Failed to load site data');
      const json = (await res.json()) as PublicLandingPayload;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load site data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initial) {
      // No injected payload (cached shell, direct API use): fetch right away.
      void refresh();
      return;
    }
    // Injected payload is already on screen; revalidate quietly once idle.
    const idleWindow = window as unknown as {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(() => void refresh(), { timeout: 4000 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }
    const handle = window.setTimeout(() => void refresh(), 2500);
    return () => window.clearTimeout(handle);
  }, [initial, refresh]);

  const value = useMemo(
    () => ({ data, loading, error, refresh }),
    [data, loading, error, refresh]
  );

  return <PublicDataContext.Provider value={value}>{children}</PublicDataContext.Provider>;
}

export function usePublicData(): PublicDataContextValue {
  const ctx = useContext(PublicDataContext);
  if (!ctx) throw new Error('usePublicData must be used inside PublicDataProvider');
  return ctx;
}

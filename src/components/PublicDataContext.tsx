import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { PublicSitePayload } from '../shared/types';

interface RefreshOptions {
  /** Admin path: bypass the edge cache so saved edits show immediately. */
  fresh?: boolean;
}

interface PublicDataContextValue {
  data: PublicSitePayload | null;
  loading: boolean;
  error: string | null;
  refresh: (options?: RefreshOptions) => Promise<void>;
}

const PublicDataContext = createContext<PublicDataContextValue | null>(null);

export function PublicDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PublicSitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: RefreshOptions) => {
    try {
      // The normal path is served from the CDN (s-maxage=60); the admin path
      // appends fresh=1 so the server answers with no-store and current data.
      const res = await fetch(options?.fresh ? '/api/public/site?fresh=1' : '/api/public/site', {
        ...(options?.fresh ? { cache: 'no-store' as RequestCache } : {}),
      });
      if (!res.ok) throw new Error('Failed to load site data');
      const json = (await res.json()) as PublicSitePayload;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load site data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

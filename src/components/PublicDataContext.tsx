import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PublicSitePayload } from '../shared/types';

interface PublicDataContextValue {
  data: PublicSitePayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PublicDataContext = createContext<PublicDataContextValue | null>(null);

export function PublicDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PublicSitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/public/site', { cache: 'no-store' });
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

  return (
    <PublicDataContext.Provider value={{ data, loading, error, refresh }}>
      {children}
    </PublicDataContext.Provider>
  );
}

export function usePublicData(): PublicDataContextValue {
  const ctx = useContext(PublicDataContext);
  if (!ctx) throw new Error('usePublicData must be used inside PublicDataProvider');
  return ctx;
}

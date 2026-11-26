import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  DestinationRecord,
  GalleryImageRecord,
  HeroImageRecord,
  ImageRecord,
  SiteSettings,
  TripWithRelations,
} from '../../shared/types';
import { usePublicData } from '../PublicDataContext';

export interface AdminUser {
  id: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
}

export interface AdminDataPayload {
  settings: SiteSettings & {
    logoImage: ImageRecord | null;
    faviconImage: ImageRecord | null;
    ogImage: ImageRecord | null;
  };
  heroImages: HeroImageRecord[];
  destinations: DestinationRecord[];
  trips: TripWithRelations[];
  galleryImages: GalleryImageRecord[];
  images: ImageRecord[];
}

interface AdminAuthContextValue {
  user: AdminUser | null;
  needsSetup: boolean;
  recoveryConfigured: boolean;
  loading: boolean;
  token: string | null;
  adminData: AdminDataPayload | null;
  dataLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  setupOwner: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateAccount: (input: {
    currentPassword: string;
    username?: string;
    newPassword?: string;
  }) => Promise<void>;
  resetAccount: (input: {
    recoveryCode: string;
    username: string;
    newPassword: string;
  }) => Promise<void>;
  refreshAdminData: () => Promise<void>;
  adminFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [recoveryConfigured, setRecoveryConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminDataPayload | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const { refresh: refreshPublic } = usePublicData();

  const adminFetch = useCallback(
    (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(input, {
        ...init,
        headers,
        credentials: 'include',
      });
    },
    [token]
  );

  const refreshAdminData = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await adminFetch('/api/admin/data', { cache: 'no-store' });
      if (res.ok) {
        const json = (await res.json()) as AdminDataPayload;
        setAdminData(json);
        await refreshPublic();
      }
    } finally {
      setDataLoading(false);
    }
  }, [adminFetch, refreshPublic]);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const json = (await res.json()) as {
          needsSetup: boolean;
          recoveryConfigured?: boolean;
          user: AdminUser | null;
        };
        setNeedsSetup(json.needsSetup);
        setRecoveryConfigured(Boolean(json.recoveryConfigured));
        setUser(json.user);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (user) {
      refreshAdminData();
    } else {
      setAdminData(null);
    }
  }, [user, refreshAdminData]);

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'فشل تسجيل الدخول');
    }
    setToken(json.token);
    setUser(json.user);
    setNeedsSetup(false);
  };

  const setupOwner = async (username: string, password: string) => {
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'تعذر إنشاء حساب المالك');
    }
    setToken(json.token);
    setUser(json.user);
    setNeedsSetup(false);
  };

  const logout = async () => {
    await adminFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setToken(null);
    setUser(null);
    setAdminData(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await adminFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'تعذر تغيير كلمة المرور');
    }
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
  };

  const updateAccount = async (input: {
    currentPassword: string;
    username?: string;
    newPassword?: string;
  }) => {
    const res = await adminFetch('/api/auth/update-account', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'تعذر تحديث بيانات الحساب');
    }
    if (json.user) {
      setUser(json.user);
    }
  };

  const resetAccount = async (input: {
    recoveryCode: string;
    username: string;
    newPassword: string;
  }) => {
    const res = await fetch('/api/auth/reset-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'تعذر إعادة تعيين الحساب');
    }
    setToken(json.token);
    setUser(json.user);
    setNeedsSetup(false);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        needsSetup,
        recoveryConfigured,
        loading,
        token,
        adminData,
        dataLoading,
        login,
        setupOwner,
        logout,
        changePassword,
        updateAccount,
        resetAccount,
        refreshAdminData,
        adminFetch,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}

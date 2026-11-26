import React, { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  Compass,
  ExternalLink,
  Home,
  Images,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { BrandLogo } from '../BrandLogo';
import { useAdminAuth } from './AdminAuthContext';

export function AdminLayout({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAdminAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Admin dashboard is strictly Arabic RTL and noindex
  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = `${title} | لوحة تحكم everyDay`;

    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex, nofollow';

    return () => {
      robots?.remove();
    };
  }, [title]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-surface-alt flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.mustChangePassword && location.pathname !== '/admin/account') {
    return <Navigate to="/admin/account" replace />;
  }

  const navItems = [
    { to: '/admin', label: 'نظرة عامة', icon: LayoutDashboard, end: true },
    { to: '/admin/trips', label: 'الرحلات', icon: Compass, end: false },
    { to: '/admin/destinations', label: 'الوجهات', icon: MapPin, end: false },
    { to: '/admin/gallery', label: 'معرض الصور', icon: Images, end: false },
    { to: '/admin/home', label: 'الصفحة الرئيسية والهيرو', icon: Home, end: false },
    { to: '/admin/settings', label: 'إعدادات الموقع', icon: Settings, end: false },
    { to: '/admin/account', label: 'الحساب وكلمة المرور', icon: KeyRound, end: false },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="px-4 py-4 bg-brand-600 rounded-xl mb-6 flex items-center justify-between">
          <BrandLogo size="sm" />
          <span className="text-xs font-semibold text-white/90">لوحة المالك</span>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-ink/80 hover:bg-surface-alt hover:text-ink'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 mt-6 border-t border-border space-y-2">
        <Link
          to="/ar"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-surface-alt transition-colors"
        >
          <span>معاينة الموقع العام</span>
          <ExternalLink className="w-4 h-4" />
        </Link>
        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج ({user.username})</span>
        </button>
      </div>
    </div>
  );

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-surface-alt text-ink flex flex-col lg:flex-row">
      <Toaster position="top-center" dir="rtl" richColors />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 bg-surface border-e border-border p-5 sticky top-0 h-screen overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden bg-surface border-b border-border px-4 h-14 flex items-center justify-between sticky top-0 z-30">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="فتح القائمة"
          className="p-2 rounded-lg hover:bg-surface-alt"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-bold text-sm text-ink truncate">{title}</span>
        <Link to="/ar" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-600">
          الموقع
        </Link>
      </header>

      {/* Mobile Sidebar Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="fixed inset-y-0 start-0 w-72 max-w-[85vw] bg-surface p-5 shadow-xl overflow-y-auto">
            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="إغلاق"
                className="p-2 rounded-lg hover:bg-surface-alt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 pb-28">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-border">
            <div>
              <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

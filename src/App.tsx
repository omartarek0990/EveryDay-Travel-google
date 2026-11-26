import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { I18nProvider } from './components/I18nProvider';
import { PublicDataProvider, usePublicData } from './components/PublicDataContext';
import { AdminShellSkeleton, TripDetailSkeleton } from './components/public/PageSkeletons';
import { imageProps } from './lib/image-url';
import type { Locale } from './shared/types';
import { HomePage } from './pages/public/HomePage';
import { NotFoundPage } from './pages/public/NotFoundPage';

// The dashboard (and its API calls) is a separate chunk that only /admin loads.
const AdminApp = lazy(() => import('./admin/AdminApp'));
// Trip detail is a secondary page: fetched on demand, prefetched from the landing page.
const TripDetailPage = lazy(() =>
  import('./pages/public/TripDetailPage').then((module) => ({ default: module.TripDetailPage }))
);

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

/**
 * Real user monitoring, loaded after the load event so it never competes with
 * the critical path. Requires Speed Insights to be enabled in the Vercel project.
 */
function SpeedInsightsOnLoad() {
  useEffect(() => {
    let cancelled = false;
    const inject = () => {
      import('@vercel/speed-insights')
        .then((module) => {
          if (!cancelled) module.injectSpeedInsights();
        })
        .catch(() => {
          /* analytics is best-effort */
        });
    };
    if (document.readyState === 'complete') {
      inject();
    } else {
      window.addEventListener('load', inject, { once: true });
    }
    return () => {
      cancelled = true;
      window.removeEventListener('load', inject);
    };
  }, []);
  return null;
}

function FaviconSync() {
  const { data } = usePublicData();
  useEffect(() => {
    const image = data?.settings.faviconImage;
    const url = image ? imageProps(image, { maxWidth: 480 }).src : null;
    if (!url) return;
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
  }, [data?.settings.faviconImage]);
  return null;
}

function LocaleShell({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <Outlet />
    </I18nProvider>
  );
}

function RootRedirect() {
  const prefersEnglish =
    typeof navigator !== 'undefined' &&
    navigator.language?.toLowerCase().startsWith('en');
  return <Navigate to={prefersEnglish ? '/en' : '/ar'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <PublicDataProvider>
        <ScrollToTop />
        <FaviconSync />
        <SpeedInsightsOnLoad />
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route path="/ar" element={<LocaleShell locale="ar" />}>
            <Route index element={<HomePage />} />
            <Route path="trips" element={<Navigate to="/ar#trips" replace />} />
            <Route
              path="trips/:slug"
              element={
                <Suspense fallback={<TripDetailSkeleton />}>
                  <TripDetailPage />
                </Suspense>
              }
            />
            <Route path="gallery" element={<Navigate to="/ar#gallery" replace />} />
            <Route path="about" element={<Navigate to="/ar#about" replace />} />
            <Route path="contact" element={<Navigate to="/ar#contact" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="/en" element={<LocaleShell locale="en" />}>
            <Route index element={<HomePage />} />
            <Route path="trips" element={<Navigate to="/en#trips" replace />} />
            <Route
              path="trips/:slug"
              element={
                <Suspense fallback={<TripDetailSkeleton />}>
                  <TripDetailPage />
                </Suspense>
              }
            />
            <Route path="gallery" element={<Navigate to="/en#gallery" replace />} />
            <Route path="about" element={<Navigate to="/en#about" replace />} />
            <Route path="contact" element={<Navigate to="/en#contact" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<AdminShellSkeleton />}>
                <AdminApp />
              </Suspense>
            }
          />

          <Route
            path="*"
            element={
              <I18nProvider locale="ar">
                <NotFoundPage />
              </I18nProvider>
            }
          />
        </Routes>
      </PublicDataProvider>
    </BrowserRouter>
  );
}

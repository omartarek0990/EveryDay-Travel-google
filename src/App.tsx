import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { I18nProvider } from './components/I18nProvider';
import { PublicDataProvider, usePublicData } from './components/PublicDataContext';
import { AdminAuthProvider } from './components/admin/AdminAuthContext';
import type { Locale } from './shared/types';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { GalleryPage } from './pages/public/GalleryPage';
import { HomePage } from './pages/public/HomePage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { TripDetailPage } from './pages/public/TripDetailPage';
import { TripsPage } from './pages/public/TripsPage';
import { AdminAccountPage } from './pages/admin/AdminAccountPage';
import { AdminDestinationsPage } from './pages/admin/AdminDestinationsPage';
import { AdminGalleryPage } from './pages/admin/AdminGalleryPage';
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminTripFormPage } from './pages/admin/AdminTripFormPage';
import { AdminTripsListPage } from './pages/admin/AdminTripsListPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function FaviconSync() {
  const { data } = usePublicData();
  useEffect(() => {
    const url = data?.settings.faviconImage?.url;
    if (!url) return;
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
  }, [data?.settings.faviconImage?.url]);
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
        <AdminAuthProvider>
          <ScrollToTop />
          <FaviconSync />
          <Routes>
            <Route path="/" element={<RootRedirect />} />

            <Route path="/ar" element={<LocaleShell locale="ar" />}>
              <Route index element={<HomePage />} />
              <Route path="trips" element={<TripsPage />} />
              <Route path="trips/:slug" element={<TripDetailPage />} />
              <Route path="gallery" element={<GalleryPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route path="/en" element={<LocaleShell locale="en" />}>
              <Route index element={<HomePage />} />
              <Route path="trips" element={<TripsPage />} />
              <Route path="trips/:slug" element={<TripDetailPage />} />
              <Route path="gallery" element={<GalleryPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/trips" element={<AdminTripsListPage />} />
            <Route path="/admin/trips/new" element={<AdminTripFormPage />} />
            <Route path="/admin/trips/:id" element={<AdminTripFormPage />} />
            <Route path="/admin/destinations" element={<AdminDestinationsPage />} />
            <Route path="/admin/gallery" element={<AdminGalleryPage />} />
            <Route path="/admin/home" element={<AdminHomePage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/account" element={<AdminAccountPage />} />

            <Route
              path="*"
              element={
                <I18nProvider locale="ar">
                  <NotFoundPage />
                </I18nProvider>
              }
            />
          </Routes>
        </AdminAuthProvider>
      </PublicDataProvider>
    </BrowserRouter>
  );
}

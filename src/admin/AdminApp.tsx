import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminAuthProvider } from '../components/admin/AdminAuthContext';
import { I18nProvider } from '../components/I18nProvider';
import { NotFoundPage } from '../pages/public/NotFoundPage';
import { AdminAccountPage } from '../pages/admin/AdminAccountPage';
import { AdminDestinationsPage } from '../pages/admin/AdminDestinationsPage';
import { AdminGalleryPage } from '../pages/admin/AdminGalleryPage';
import { AdminHomePage } from '../pages/admin/AdminHomePage';
import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminOverviewPage } from '../pages/admin/AdminOverviewPage';
import { AdminResetPage } from '../pages/admin/AdminResetPage';
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage';
import { AdminTripFormPage } from '../pages/admin/AdminTripFormPage';
import { AdminTripsListPage } from '../pages/admin/AdminTripsListPage';

/**
 * Everything under /admin lives in one lazy chunk: the dashboard code (and its
 * /api/auth/* and /api/admin/* calls) never reaches a public visitor.
 */
export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route path="reset" element={<AdminResetPage />} />
        <Route index element={<AdminOverviewPage />} />
        <Route path="trips" element={<AdminTripsListPage />} />
        <Route path="trips/new" element={<AdminTripFormPage />} />
        <Route path="trips/:id" element={<AdminTripFormPage />} />
        <Route path="destinations" element={<AdminDestinationsPage />} />
        <Route path="gallery" element={<AdminGalleryPage />} />
        <Route path="home" element={<AdminHomePage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="account" element={<AdminAccountPage />} />
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
  );
}

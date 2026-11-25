import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, Images, MapPin, Plus, Settings } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { formatWesternNumber } from '../../shared/format';

export function AdminOverviewPage() {
  const { adminData, dataLoading } = useAdminAuth();

  const totalTrips = adminData?.trips.length ?? 0;
  const publishedTrips = adminData?.trips.filter((t) => t.status === 'PUBLISHED').length ?? 0;
  const activeDestinations = adminData?.destinations.filter((d) => d.isActive).length ?? 0;
  const galleryCount = adminData?.galleryImages.length ?? 0;

  const stats = [
    { label: 'إجمالي الرحلات', value: totalTrips, to: '/admin/trips' },
    { label: 'الرحلات المنشورة', value: publishedTrips, to: '/admin/trips' },
    { label: 'الوجهات المفعلة', value: activeDestinations, to: '/admin/destinations' },
    { label: 'صور المعرض', value: galleryCount, to: '/admin/gallery' },
  ];

  const shortcuts = [
    {
      title: 'إضافة رحلة جديدة',
      desc: 'أضف رحلة باللغة العربية مع الصور والبرنامج والأنشطة الاختيارية',
      to: '/admin/trips/new',
      icon: Plus,
      primary: true,
    },
    {
      title: 'الصفحة الرئيسية والهيرو',
      desc: 'تعديل صور العرض الرئيسي، الفاصل الزمني، وإظهار أو إخفاء الأقسام',
      to: '/admin/home',
      icon: Home,
      primary: false,
    },
    {
      title: 'إدارة معرض الصور',
      desc: 'رفع صور متعددة وترتيبها وإضافة تعليقات',
      to: '/admin/gallery',
      icon: Images,
      primary: false,
    },
    {
      title: 'الوجهات',
      desc: 'إضافة وتعديل وترتيب الوجهات السياحية داخل مصر',
      to: '/admin/destinations',
      icon: MapPin,
      primary: false,
    },
    {
      title: 'الرحلات الحالية',
      desc: 'ترتيب الرحلات وتغيير حالتها بين مسودة ومنشور ومخفي',
      to: '/admin/trips',
      icon: Compass,
      primary: false,
    },
    {
      title: 'إعدادات الشركة والتواصل',
      desc: 'رقم الهاتف والواتساب وروابط السوشيال ميديا ونص من نحن',
      to: '/admin/settings',
      icon: Settings,
      primary: false,
    },
  ];

  return (
    <AdminLayout
      title="نظرة عامة"
      subtitle="ملخص سريع لمحتوى موقع everyDay للسياحة"
      action={
        <Link
          to="/admin/trips/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>رحلة جديدة</span>
        </Link>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="rounded-2xl bg-surface border border-border p-5 hover:border-brand-600 transition-colors"
          >
            <p className="text-xs font-semibold text-muted">{s.label}</p>
            <p className="mt-2 text-3xl font-extrabold text-ink tabular-nums">
              {dataLoading && !adminData ? '—' : formatWesternNumber(s.value, 'ar')}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick Shortcuts */}
      <h2 className="text-lg font-extrabold text-ink mb-4">اختصارات سريعة</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-2xl bg-surface border border-border p-5 hover:border-brand-600 transition-colors flex flex-col justify-between gap-4"
            >
              <div>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    item.primary
                      ? 'bg-brand-600 text-white'
                      : 'bg-surface-alt text-brand-700 border border-border'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm text-muted leading-relaxed">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </AdminLayout>
  );
}

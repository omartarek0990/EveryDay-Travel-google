import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { LocalizedField } from '../../components/admin/LocalizedField';
import { StickySaveBar } from '../../components/admin/StickySaveBar';
import {
  egyptianPhoneInputSchema,
  formatLocalEgyptianPhone,
  httpsUrlSchema,
} from '../../shared/schemas';
import type { ImageRecord, LocalizedText } from '../../shared/types';

type TabKey = 'company' | 'contact' | 'social' | 'about' | 'seo';

export function AdminSettingsPage() {
  const { adminData, adminFetch, refreshAdminData } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('company');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failedFields, setFailedFields] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Company
  const [companyName, setCompanyName] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [logoImages, setLogoImages] = useState<ImageRecord[]>([]);
  const [faviconImages, setFaviconImages] = useState<ImageRecord[]>([]);

  // Contact
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [mapUrl, setMapUrl] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState<LocalizedText>({ ar: '', en: '', enManual: false });

  // Social
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

  // About
  const [aboutTitle, setAboutTitle] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [aboutBody, setAboutBody] = useState<LocalizedText>({ ar: '', en: '', enManual: false });

  // SEO & Page Intros
  const [seoTitle, setSeoTitle] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [seoDescription, setSeoDescription] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [ogImages, setOgImages] = useState<ImageRecord[]>([]);
  const [tripsIntro, setTripsIntro] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [galleryTitle, setGalleryTitle] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [contactIntro, setContactIntro] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [footerTagline, setFooterTagline] = useState<LocalizedText>({ ar: '', en: '', enManual: false });

  const loadFromAdminData = () => {
    if (!adminData) return;
    const s = adminData.settings;
    setCompanyName(s.companyName);
    setLogoImages(s.logoImage ? [s.logoImage] : []);
    setFaviconImages(s.faviconImage ? [s.faviconImage] : []);
    setPhone(s.phone);
    setWhatsapp(formatLocalEgyptianPhone(s.whatsapp));
    setEmail(s.email);
    setAddress(s.address);
    setMapUrl(s.mapUrl);
    setWhatsappMessage(s.whatsappMessage);
    setTiktokUrl(s.tiktokUrl);
    setFacebookUrl(s.facebookUrl);
    setInstagramUrl(s.instagramUrl);
    setAboutTitle(s.aboutTitle);
    setAboutBody(s.aboutBody);
    setSeoTitle(s.seoTitle);
    setSeoDescription(s.seoDescription);
    setOgImages(s.ogImage ? [s.ogImage] : []);
    setTripsIntro(s.tripsIntro);
    setGalleryTitle(s.galleryTitle);
    setContactIntro(s.contactIntro);
    setFooterTagline(s.footerTagline);
    setFieldErrors({});
    setIsDirty(false);
  };

  useEffect(() => {
    loadFromAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminData]);

  const validateInline = (): boolean => {
    const errs: Record<string, string> = {};
    const phoneCheck = egyptianPhoneInputSchema.safeParse(phone);
    if (!phoneCheck.success) errs.phone = phoneCheck.error.issues[0].message;

    const waCheck = egyptianPhoneInputSchema.safeParse(whatsapp);
    if (!waCheck.success) errs.whatsapp = waCheck.error.issues[0].message;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'البريد الإلكتروني غير صحيح';
    }

    for (const [k, val] of [
      ['mapUrl', mapUrl],
      ['tiktokUrl', tiktokUrl],
      ['facebookUrl', facebookUrl],
      ['instagramUrl', instagramUrl],
    ] as const) {
      const check = httpsUrlSchema.safeParse(val);
      if (!check.success) errs[k] = check.error.issues[0].message;
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('راجع الأخطاء الموضحة في النموذج');
      return false;
    }
    return true;
  };

  const handleSave = async (forceTranslateFields: string[] = []) => {
    if (!validateInline()) return;
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          companyName,
          logoImageId: logoImages[0]?.id ?? null,
          faviconImageId: faviconImages[0]?.id ?? null,
          phone,
          whatsapp,
          email,
          address,
          mapUrl,
          tiktokUrl,
          facebookUrl,
          instagramUrl,
          whatsappMessage,
          seoTitle,
          seoDescription,
          ogImageId: ogImages[0]?.id ?? null,
          aboutTitle,
          aboutBody,
          tripsIntro,
          galleryTitle,
          contactIntro,
          footerTagline,
          forceTranslateFields,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'تعذر حفظ الإعدادات');

      setFailedFields(json.failedFields || []);
      await refreshAdminData();
      setIsDirty(false);

      if (json.failedFields?.length > 0) {
        toast.warning('تم الحفظ ولكن تعذرت ترجمة بعض الحقول.');
      } else {
        toast.success('تم حفظ إعدادات الموقع بنجاح');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const failedSet = new Set(failedFields);
  const inputCls =
    'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none';

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'company', label: 'الشركة والشعار' },
    { key: 'contact', label: 'بيانات التواصل' },
    { key: 'social', label: 'السوشيال ميديا' },
    { key: 'about', label: 'صفحة من نحن' },
    { key: 'seo', label: 'SEO والنصوص العامة' },
  ];

  return (
    <AdminLayout title="إعدادات الموقع" subtitle="بيانات الشركة، أرقام التواصل، السوشيال ميديا، و SEO">
      {failedFields.length > 0 && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-900 font-medium">
            تعذرت ترجمة {failedFields.length} حقل. تم حفظ النص العربي.
          </p>
          <button
            type="button"
            onClick={() => handleSave(failedFields)}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
          >
            إعادة محاولة الترجمة
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-surface border border-border text-ink hover:bg-surface-alt'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-surface border border-border p-6 space-y-6">
        {activeTab === 'company' && (
          <>
            <LocalizedField
              label="اسم الشركة"
              value={companyName}
              onChange={(v) => {
                setCompanyName(v);
                setIsDirty(true);
              }}
              translating={saving}
              failed={failedSet.has('companyName')}
              onRetryTranslate={() => handleSave(['companyName'])}
            />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-ink">
                الشعار الشفاف الأبيض (Logo)
              </label>
              <p className="text-xs text-muted">
                يُعرض الشعار على خلفية داكنة أو برتقالية فقط. في حال عدم الرفع يظهر شعار النص الافتراضي.
              </p>
              <ImageUploader
                images={logoImages}
                onChange={(imgs) => {
                  setLogoImages(imgs);
                  setIsDirty(true);
                }}
                multiple={false}
                maxImages={1}
                folder="everyday/brand"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-ink">أيقونة الموقع (Favicon)</label>
              <ImageUploader
                images={faviconImages}
                onChange={(imgs) => {
                  setFaviconImages(imgs);
                  setIsDirty(true);
                }}
                multiple={false}
                maxImages={1}
                folder="everyday/brand"
              />
            </div>
          </>
        )}

        {activeTab === 'contact' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-ink">رقم الهاتف المصري</label>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setIsDirty(true);
                  }}
                  className={inputCls}
                />
                {fieldErrors.phone && <p className="text-xs text-red-600">{fieldErrors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-ink">رقم واتساب (مصري)</label>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="01012345678"
                  value={whatsapp}
                  onChange={(e) => {
                    setWhatsapp(e.target.value);
                    setIsDirty(true);
                  }}
                  className={inputCls}
                />
                <p className="text-xs text-muted">
                  أدخل الرقم المحلي (01xxxxxxxxx) وسيتم تحويله تلقائياً إلى الصيغة الدولية (201xxxxxxxxx).
                </p>
                {fieldErrors.whatsapp && (
                  <p className="text-xs text-red-600">{fieldErrors.whatsapp}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-ink">البريد الإلكتروني</label>
                <input
                  type="email"
                  dir="ltr"
                  placeholder="info@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsDirty(true);
                  }}
                  className={inputCls}
                />
                {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-ink">رابط الموقع على الخرائط</label>
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://maps.google.com/..."
                  value={mapUrl}
                  onChange={(e) => {
                    setMapUrl(e.target.value);
                    setIsDirty(true);
                  }}
                  className={inputCls}
                />
                {fieldErrors.mapUrl && <p className="text-xs text-red-600">{fieldErrors.mapUrl}</p>}
              </div>
            </div>

            <LocalizedField
              label="العنوان"
              value={address}
              onChange={(v) => {
                setAddress(v);
                setIsDirty(true);
              }}
              translating={saving}
              failed={failedSet.has('address')}
              onRetryTranslate={() => handleSave(['address'])}
            />

            <LocalizedField
              label="قالب رسالة الواتساب"
              value={whatsappMessage}
              onChange={(v) => {
                setWhatsappMessage(v);
                setIsDirty(true);
              }}
              helperText="يمكنك استخدام {trip} لاسم الرحلة و {url} لرابط الصفحة."
              translating={saving}
              failed={failedSet.has('whatsappMessage')}
              onRetryTranslate={() => handleSave(['whatsappMessage'])}
            />
          </>
        )}

        {activeTab === 'social' && (
          <div className="space-y-5">
            {[
              { key: 'facebookUrl', label: 'رابط فيسبوك (Facebook)', val: facebookUrl, set: setFacebookUrl },
              { key: 'instagramUrl', label: 'رابط إنستغرام (Instagram)', val: instagramUrl, set: setInstagramUrl },
              { key: 'tiktokUrl', label: 'رابط تيك توك (TikTok)', val: tiktokUrl, set: setTiktokUrl },
            ].map((item) => (
              <div key={item.key} className="space-y-1.5">
                <label className="block text-sm font-semibold text-ink">{item.label}</label>
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://..."
                  value={item.val}
                  onChange={(e) => {
                    item.set(e.target.value);
                    setIsDirty(true);
                  }}
                  className={inputCls}
                />
                {fieldErrors[item.key] && (
                  <p className="text-xs text-red-600">{fieldErrors[item.key]}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-5">
            <LocalizedField
              label="عنوان صفحة من نحن"
              value={aboutTitle}
              onChange={(v) => {
                setAboutTitle(v);
                setIsDirty(true);
              }}
              translating={saving}
              failed={failedSet.has('aboutTitle')}
              onRetryTranslate={() => handleSave(['aboutTitle'])}
            />
            <LocalizedField
              label="نص صفحة من نحن"
              value={aboutBody}
              multiline
              rows={6}
              onChange={(v) => {
                setAboutBody(v);
                setIsDirty(true);
              }}
              translating={saving}
              failed={failedSet.has('aboutBody')}
              onRetryTranslate={() => handleSave(['aboutBody'])}
            />
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-5">
            <LocalizedField
              label="عنوان SEO الافتراضي"
              value={seoTitle}
              onChange={(v) => {
                setSeoTitle(v);
                setIsDirty(true);
              }}
              translating={saving}
              failed={failedSet.has('seoTitle')}
              onRetryTranslate={() => handleSave(['seoTitle'])}
            />
            <LocalizedField
              label="وصف SEO الافتراضي"
              value={seoDescription}
              multiline
              rows={2}
              onChange={(v) => {
                setSeoDescription(v);
                setIsDirty(true);
              }}
              translating={saving}
              failed={failedSet.has('seoDescription')}
              onRetryTranslate={() => handleSave(['seoDescription'])}
            />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-ink">صورة المشاركة الافتراضية (OG Image)</label>
              <ImageUploader
                images={ogImages}
                onChange={(imgs) => {
                  setOgImages(imgs);
                  setIsDirty(true);
                }}
                multiple={false}
                maxImages={1}
                folder="everyday/seo"
              />
            </div>

            <LocalizedField
              label="مقدمة صفحة الرحلات"
              value={tripsIntro}
              onChange={(v) => {
                setTripsIntro(v);
                setIsDirty(true);
              }}
              translating={saving}
              failed={failedSet.has('tripsIntro')}
              onRetryTranslate={() => handleSave(['tripsIntro'])}
            />
            <LocalizedField
              label="وصف صفحة معرض الصور"
              value={galleryTitle}
              onChange={(v) => {
                setGalleryTitle(v);
                setIsDirty(true);
              }}
              translating={saving}
              failed={failedSet.has('galleryTitle')}
              onRetryTranslate={() => handleSave(['galleryTitle'])}
            />
            <LocalizedField
              label="نص دعوة التواصل"
              value={contactIntro}
              onChange={(v) => {
                setContactIntro(v);
                setIsDirty(true);
              }}
              translating={saving}
              failed={failedSet.has('contactIntro')}
              onRetryTranslate={() => handleSave(['contactIntro'])}
            />
            <LocalizedField
              label="شعار الفوتر (Tagline)"
              value={footerTagline}
              onChange={(v) => {
                setFooterTagline(v);
                setIsDirty(true);
              }}
              translating={saving}
              failed={failedSet.has('footerTagline')}
              onRetryTranslate={() => handleSave(['footerTagline'])}
            />
          </div>
        )}
      </div>

      <StickySaveBar
        isDirty={isDirty}
        saving={saving}
        onSave={() => handleSave()}
        onReset={loadFromAdminData}
      />
    </AdminLayout>
  );
}

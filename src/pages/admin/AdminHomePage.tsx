import React, { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { LocalizedField } from '../../components/admin/LocalizedField';
import { StickySaveBar } from '../../components/admin/StickySaveBar';
import type { ImageRecord, LocalizedText, WhyUsItem } from '../../shared/types';

function SortableWhyUsCard({
  item,
  index,
  failedTitle,
  failedBody,
  saving,
  onChange,
  onRemove,
  onRetry,
}: {
  item: WhyUsItem;
  index: number;
  failedTitle: boolean;
  failedBody: boolean;
  saving: boolean;
  onChange: (next: WhyUsItem) => void;
  onRemove: () => void;
  onRetry: (fieldKey: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="rounded-xl border border-border bg-surface-alt/50 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="اسحب لإعادة الترتيب"
            className="p-1.5 rounded-lg hover:bg-surface text-muted cursor-grab"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-brand-700 tabular-nums">عنصر 0{index + 1}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="حذف العنصر"
          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <LocalizedField
        label="العنوان"
        value={item.title}
        onChange={(title) => onChange({ ...item, title })}
        translating={saving}
        failed={failedTitle}
        onRetryTranslate={() => onRetry(`whyUs.${index}.title`)}
      />
      <LocalizedField
        label="الشرح"
        value={item.body}
        multiline
        rows={2}
        onChange={(body) => onChange({ ...item, body })}
        translating={saving}
        failed={failedBody}
        onRetryTranslate={() => onRetry(`whyUs.${index}.body`)}
      />
    </div>
  );
}

export function AdminHomePage() {
  const { adminData, adminFetch, refreshAdminData } = useAdminAuth();
  const [heroBadge, setHeroBadge] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [heroTitle, setHeroTitle] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [heroSubtitle, setHeroSubtitle] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [heroDescription, setHeroDescription] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [heroFeatures, setHeroFeatures] = useState<LocalizedText[]>([
    { ar: '', en: '', enManual: false },
    { ar: '', en: '', enManual: false },
    { ar: '', en: '', enManual: false },
  ]);
  const [heroIntervalSeconds, setHeroIntervalSeconds] = useState(5);
  const [heroImages, setHeroImages] = useState<ImageRecord[]>([]);
  const [showTripsSection, setShowTripsSection] = useState(true);
  const [showWhyUsSection, setShowWhyUsSection] = useState(true);
  const [showGallerySection, setShowGallerySection] = useState(true);
  const [showContactSection, setShowContactSection] = useState(true);
  const [whyUsItems, setWhyUsItems] = useState<WhyUsItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failedFields, setFailedFields] = useState<string[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadFromAdminData = () => {
    if (!adminData) return;
    const s = adminData.settings;
    setHeroBadge(s.heroBadge);
    setHeroTitle(s.heroTitle);
    setHeroSubtitle(s.heroSubtitle);
    setHeroDescription(s.heroDescription);
    setHeroFeatures(
      s.heroFeatures.length === 3
        ? s.heroFeatures
        : [
            s.heroFeatures[0] || { ar: '', en: '', enManual: false },
            s.heroFeatures[1] || { ar: '', en: '', enManual: false },
            s.heroFeatures[2] || { ar: '', en: '', enManual: false },
          ]
    );
    setHeroIntervalSeconds(s.heroIntervalSeconds);
    setHeroImages(
      adminData.heroImages.map((h) => h.image).filter((i): i is ImageRecord => Boolean(i))
    );
    setShowTripsSection(s.showTripsSection);
    setShowWhyUsSection(s.showWhyUsSection);
    setShowGallerySection(s.showGallerySection);
    setShowContactSection(s.showContactSection);
    setWhyUsItems(s.whyUsItems);
    setIsDirty(false);
  };

  useEffect(() => {
    loadFromAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminData]);

  const handleSave = async (forceTranslateFields: string[] = []) => {
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/home', {
        method: 'PUT',
        body: JSON.stringify({
          heroBadge,
          heroTitle,
          heroSubtitle,
          heroDescription,
          heroFeatures,
          heroIntervalSeconds,
          showTripsSection,
          showWhyUsSection,
          showGallerySection,
          showContactSection,
          whyUsItems,
          heroImageIds: heroImages.map((i) => i.id),
          forceTranslateFields,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'تعذر حفظ الصفحة الرئيسية');

      setFailedFields(json.failedFields || []);
      await refreshAdminData();
      setIsDirty(false);

      if (json.failedFields?.length > 0) {
        toast.warning('تم الحفظ ولكن تعذرت ترجمة بعض الحقول. يمكنك إعادة المحاولة.');
      } else {
        toast.success('تم حفظ الصفحة الرئيسية والترجمة بنجاح');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleWhyUsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = whyUsItems.findIndex((i) => i.id === active.id);
    const newIdx = whyUsItems.findIndex((i) => i.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      setWhyUsItems(arrayMove(whyUsItems, oldIdx, newIdx));
      setIsDirty(true);
    }
  };

  const failedSet = new Set(failedFields);

  return (
    <AdminLayout
      title="الصفحة الرئيسية والهيرو"
      subtitle="تحكم في صور العرض الرئيسي، النصوص، الفاصل الزمني، وإظهار الأقسام"
    >
      {failedFields.length > 0 && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-900 font-medium">
            تعذرت ترجمة {failedFields.length} حقل. تم حفظ النص العربي بأمان.
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

      <div className="space-y-8">
        {/* Hero Images & Interval */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-5">
          <h2 className="text-lg font-extrabold text-ink">صور الهيرو (العرض الرئيسي)</h2>
          <ImageUploader
            images={heroImages}
            onChange={(next) => {
              setHeroImages(next);
              setIsDirty(true);
            }}
            multiple
            folder="everyday/hero"
          />

          <div className="pt-4 border-t border-border max-w-sm space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <label htmlFor="hero-interval">الفاصل الزمني للتبديل (بالثواني)</label>
              <span className="tabular-nums text-brand-700">{heroIntervalSeconds} ثوانٍ</span>
            </div>
            <input
              id="hero-interval"
              type="range"
              min={3}
              max={15}
              value={heroIntervalSeconds}
              onChange={(e) => {
                setHeroIntervalSeconds(Number(e.target.value));
                setIsDirty(true);
              }}
              className="w-full accent-brand-600"
            />
            <p className="text-xs text-muted">
              من 3 إلى 15 ثانية. إذا كانت هناك صورة واحدة فقط يتم إيقاف الحركة تلقائياً.
            </p>
          </div>
        </section>

        {/* Hero Copy */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-5">
          <h2 className="text-lg font-extrabold text-ink">نصوص الهيرو</h2>
          <LocalizedField
            label="الشارة العلوية (Badge)"
            value={heroBadge}
            onChange={(v) => {
              setHeroBadge(v);
              setIsDirty(true);
            }}
            translating={saving}
            failed={failedSet.has('heroBadge')}
            onRetryTranslate={() => handleSave(['heroBadge'])}
          />
          <LocalizedField
            label="العنوان الفرعي"
            value={heroSubtitle}
            onChange={(v) => {
              setHeroSubtitle(v);
              setIsDirty(true);
            }}
            translating={saving}
            failed={failedSet.has('heroSubtitle')}
            onRetryTranslate={() => handleSave(['heroSubtitle'])}
          />
          <LocalizedField
            label="العنوان الرئيسي"
            value={heroTitle}
            onChange={(v) => {
              setHeroTitle(v);
              setIsDirty(true);
            }}
            translating={saving}
            failed={failedSet.has('heroTitle')}
            onRetryTranslate={() => handleSave(['heroTitle'])}
          />
          <LocalizedField
            label="الوصف"
            value={heroDescription}
            multiline
            rows={3}
            onChange={(v) => {
              setHeroDescription(v);
              setIsDirty(true);
            }}
            translating={saving}
            failed={failedSet.has('heroDescription')}
            onRetryTranslate={() => handleSave(['heroDescription'])}
          />

          <div className="pt-4 border-t border-border space-y-4">
            <h3 className="text-sm font-bold text-ink">شريط المميزات أسفل الهيرو (3 عناصر)</h3>
            {heroFeatures.map((feat, idx) => (
              <LocalizedField
                key={idx}
                label={`ميزة ${idx + 1}`}
                value={feat}
                onChange={(v) => {
                  const next = [...heroFeatures];
                  next[idx] = v;
                  setHeroFeatures(next);
                  setIsDirty(true);
                }}
                translating={saving}
                failed={failedSet.has(`heroFeatures.${idx}`)}
                onRetryTranslate={() => handleSave([`heroFeatures.${idx}`])}
              />
            ))}
          </div>
        </section>

        {/* Section Visibility Switches */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-ink">إظهار وإخفاء أقسام الصفحة الرئيسية</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'قسم أحدث الرحلات', checked: showTripsSection, set: setShowTripsSection },
              { label: 'قسم لماذا everyDay', checked: showWhyUsSection, set: setShowWhyUsSection },
              { label: 'قسم معرض الصور', checked: showGallerySection, set: setShowGallerySection },
              { label: 'قسم دعوة التواصل', checked: showContactSection, set: setShowContactSection },
            ].map((sw) => (
              <label
                key={sw.label}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-alt/40 cursor-pointer"
              >
                <span className="text-sm font-semibold text-ink">{sw.label}</span>
                <input
                  type="checkbox"
                  checked={sw.checked}
                  onChange={(e) => {
                    sw.set(e.target.checked);
                    setIsDirty(true);
                  }}
                  className="w-5 h-5 accent-brand-600 rounded"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Why everyDay Items (up to 4) */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-ink">عناصر لماذا everyDay (حتى 4 عناصر)</h2>
              <p className="text-xs text-muted mt-0.5">اسحب العناصر لإعادة ترتيبها</p>
            </div>
            {whyUsItems.length < 4 && (
              <button
                type="button"
                onClick={() => {
                  setWhyUsItems([
                    ...whyUsItems,
                    {
                      id: `why-${Date.now()}`,
                      title: { ar: '', en: '', enManual: false },
                      body: { ar: '', en: '', enManual: false },
                    },
                  ]);
                  setIsDirty(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border hover:border-brand-600 text-xs font-semibold text-ink"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة عنصر</span>
              </button>
            )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleWhyUsDragEnd}
          >
            <SortableContext items={whyUsItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {whyUsItems.map((item, idx) => (
                  <SortableWhyUsCard
                    key={item.id}
                    item={item}
                    index={idx}
                    saving={saving}
                    failedTitle={failedSet.has(`whyUs.${idx}.title`)}
                    failedBody={failedSet.has(`whyUs.${idx}.body`)}
                    onChange={(nextItem) => {
                      setWhyUsItems(whyUsItems.map((w) => (w.id === item.id ? nextItem : w)));
                      setIsDirty(true);
                    }}
                    onRemove={() => {
                      setWhyUsItems(whyUsItems.filter((w) => w.id !== item.id));
                      setIsDirty(true);
                    }}
                    onRetry={(fieldKey) => handleSave([fieldKey])}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
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

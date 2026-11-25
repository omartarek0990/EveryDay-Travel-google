import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { ArrowRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { LocalizedField } from '../../components/admin/LocalizedField';
import { StickySaveBar } from '../../components/admin/StickySaveBar';
import { tripInputSchema } from '../../shared/schemas';
import type {
  ActivityPricing,
  ImageRecord,
  LocalizedText,
  PricePrefix,
  PriceUnit,
  TripStatus,
} from '../../shared/types';

interface FeatureRow {
  id: string;
  text: LocalizedText;
}

interface DayRow {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
}

interface ActivityRow {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  pricing: ActivityPricing;
  priceAmount: string;
}

function SortableRepeaterRow({
  id,
  label,
  onRemove,
  canRemove = true,
  children,
}: {
  id: string;
  label: string;
  onRemove: () => void;
  canRemove?: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="rounded-xl border border-border bg-surface-alt/40 p-4 space-y-3"
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
          <span className="text-xs font-bold text-brand-700">{label}</span>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="حذف"
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

const emptyLoc = (): LocalizedText => ({ ar: '', en: '', enManual: false });

export function AdminTripFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { adminData, adminFetch, refreshAdminData } = useAdminAuth();

  const [title, setTitle] = useState<LocalizedText>(emptyLoc());
  const [destinationId, setDestinationId] = useState('');
  const [tagline, setTagline] = useState<LocalizedText>(emptyLoc());
  const [badge, setBadge] = useState<LocalizedText>(emptyLoc());
  const [durationDays, setDurationDays] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [pricePrefix, setPricePrefix] = useState<PricePrefix>('STARTING_FROM');
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('PER_PERSON');
  const [status, setStatus] = useState<TripStatus>('DRAFT');
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([
    { id: 'f-1', text: emptyLoc() },
    { id: 'f-2', text: emptyLoc() },
  ]);
  const [description, setDescription] = useState<LocalizedText>(emptyLoc());
  const [itinerary, setItinerary] = useState<DayRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [slug, setSlug] = useState<string | null>(null);

  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failedFields, setFailedFields] = useState<string[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const existingTrip = !isNew ? adminData?.trips.find((t) => t.id === id) ?? null : null;

  useEffect(() => {
    if (!adminData) return;
    if (isNew) {
      if (!destinationId && adminData.destinations[0]) {
        setDestinationId(adminData.destinations[0].id);
      }
      return;
    }
    if (existingTrip) {
      setSlug(existingTrip.slug);
      setTitle(existingTrip.title);
      setDestinationId(existingTrip.destinationId);
      setTagline(existingTrip.tagline);
      setBadge(existingTrip.badge ?? emptyLoc());
      setDurationDays(existingTrip.durationDays ? String(existingTrip.durationDays) : '');
      setPriceAmount(existingTrip.priceAmount !== null ? String(existingTrip.priceAmount) : '');
      setPricePrefix(existingTrip.pricePrefix);
      setPriceUnit(existingTrip.priceUnit);
      setStatus(existingTrip.status);
      setImages(
        existingTrip.images.map((ti) => ti.image).filter((img): img is ImageRecord => Boolean(img))
      );
      setFeatures(
        existingTrip.features.length > 0
          ? existingTrip.features.map((f, i) => ({ id: `f-${i}-${Date.now()}`, text: f }))
          : [
              { id: 'f-1', text: emptyLoc() },
              { id: 'f-2', text: emptyLoc() },
            ]
      );
      setDescription(existingTrip.description);
      setItinerary(
        existingTrip.itinerary.map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
        }))
      );
      setActivities(
        existingTrip.optionalActivities.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          pricing: a.pricing,
          priceAmount: a.priceAmount ? String(a.priceAmount) : '',
        }))
      );
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingTrip?.id, adminData?.destinations.length, isNew]);

  const handleSave = async (forceTranslateFields: string[] = []) => {
    const payload = {
      title,
      destinationId,
      tagline,
      badge: badge.ar.trim() ? badge : null,
      features: features.map((f) => f.text),
      description,
      durationDays: durationDays.trim() ? Number(durationDays) : null,
      priceAmount: priceAmount.trim() ? Number(priceAmount) : null,
      pricePrefix,
      priceUnit,
      status,
      imageIds: images.map((i) => i.id),
      itinerary: itinerary.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
      })),
      optionalActivities: activities.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        pricing: a.pricing,
        priceAmount:
          a.pricing === 'EXTRA_COST' && a.priceAmount.trim() ? Number(a.priceAmount) : null,
      })),
      forceTranslateFields,
    };

    const validation = tripInputSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || 'راجع البيانات المطلوبة');
      return;
    }

    setSaving(true);
    try {
      const url = isNew ? '/api/admin/trips' : `/api/admin/trips/${id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await adminFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'تعذر حفظ الرحلة');

      setFailedFields(json.failedFields || []);
      await refreshAdminData();
      setIsDirty(false);

      if (json.failedFields?.length > 0) {
        toast.warning('تم حفظ الرحلة ولكن تعذرت ترجمة بعض الحقول');
      } else {
        toast.success('تم حفظ الرحلة وترجمتها بنجاح');
      }

      if (isNew && json.trip?.id) {
        navigate(`/admin/trips/${json.trip.id}`, { replace: true });
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

  return (
    <AdminLayout
      title={isNew ? 'إضافة رحلة جديدة' : `تعديل: ${title.ar || 'رحلة'}`}
      subtitle={slug ? `الرابط الثابت: /trips/${slug}` : 'سيتم توليد الرابط الإنجليزي تلقائياً بعد الحفظ'}
      action={
        <Link
          to="/admin/trips"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-alt text-sm font-semibold text-ink"
        >
          <ArrowRight className="w-4 h-4" />
          <span>كل الرحلات</span>
        </Link>
      }
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
        {/* 1. Basics */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-5">
          <h2 className="text-lg font-extrabold text-ink">البيانات الأساسية</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-ink">
                الوجهة <span className="text-red-600">*</span>
              </label>
              <select
                value={destinationId}
                onChange={(e) => {
                  setDestinationId(e.target.value);
                  setIsDirty(true);
                }}
                className={inputCls}
              >
                <option value="">اختر الوجهة</option>
                {(adminData?.destinations || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name.ar}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-ink">حالة النشر</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as TripStatus);
                  setIsDirty(true);
                }}
                className={inputCls}
              >
                <option value="DRAFT">مسودة (غير ظاهرة للزوار)</option>
                <option value="PUBLISHED">منشورة (ظاهرة في الموقع)</option>
                <option value="HIDDEN">مخفية</option>
              </select>
              <p className="text-xs text-muted">
                للنشر يلزم: العنوان، الوجهة، الوصف المختصر، صورة واحدة على الأقل، و 2 إلى 4 مميزات.
              </p>
            </div>
          </div>

          <LocalizedField
            label="عنوان الرحلة"
            required
            value={title}
            onChange={(v) => {
              setTitle(v);
              setIsDirty(true);
            }}
            translating={saving}
            failed={failedSet.has('title')}
            onRetryTranslate={() => handleSave(['title'])}
          />

          <LocalizedField
            label="وصف مختصر (Tagline)"
            required
            value={tagline}
            onChange={(v) => {
              setTagline(v);
              setIsDirty(true);
            }}
            translating={saving}
            failed={failedSet.has('tagline')}
            onRetryTranslate={() => handleSave(['tagline'])}
          />

          <LocalizedField
            label="شارة اختيارية على الكارت (مثال: الأكثر طلباً)"
            value={badge}
            onChange={(v) => {
              setBadge(v);
              setIsDirty(true);
            }}
            translating={saving}
            failed={failedSet.has('badge')}
            onRetryTranslate={() => handleSave(['badge'])}
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-ink">المدة (بالأيام)</label>
              <input
                type="number"
                min={1}
                max={90}
                dir="ltr"
                placeholder="4"
                value={durationDays}
                onChange={(e) => {
                  setDurationDays(e.target.value);
                  setIsDirty(true);
                }}
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-ink">السعر (ج.م اختياري)</label>
              <input
                type="number"
                min={0}
                dir="ltr"
                placeholder="اتركه فارغاً للتواصل"
                value={priceAmount}
                onChange={(e) => {
                  setPriceAmount(e.target.value);
                  setIsDirty(true);
                }}
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-ink">بادئة السعر</label>
              <select
                value={pricePrefix}
                onChange={(e) => {
                  setPricePrefix(e.target.value as PricePrefix);
                  setIsDirty(true);
                }}
                className={inputCls}
              >
                <option value="STARTING_FROM">ابتداءً من</option>
                <option value="NONE">بدون بادئة</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-ink">وحدة السعر</label>
              <select
                value={priceUnit}
                onChange={(e) => {
                  setPriceUnit(e.target.value as PriceUnit);
                  setIsDirty(true);
                }}
                className={inputCls}
              >
                <option value="PER_PERSON">للفرد</option>
                <option value="PER_TRIP">للرحلة</option>
                <option value="NONE">بدون وحدة</option>
              </select>
            </div>
          </div>
        </section>

        {/* 2. Images */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-ink">صور الرحلة</h2>
            <p className="text-xs text-muted mt-0.5">
              الصورة الأولى تُستخدم كغلاف للرحلة. اسحب الصور لإعادة ترتيبها.
            </p>
          </div>
          <ImageUploader
            images={images}
            onChange={(next) => {
              setImages(next);
              setIsDirty(true);
            }}
            multiple
            showCoverBadge
            folder="everyday/trips"
          />
        </section>

        {/* 3. Features (2 to 4) */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-ink">مميزات الرحلة (من 2 إلى 4 نقاط)</h2>
              <p className="text-xs text-muted mt-0.5">تظهر في كارت الرحلة وصفحة التفاصيل</p>
            </div>
            {features.length < 4 && (
              <button
                type="button"
                onClick={() => {
                  setFeatures([...features, { id: `f-${Date.now()}`, text: emptyLoc() }]);
                  setIsDirty(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border hover:border-brand-600 text-xs font-semibold text-ink"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة ميزة</span>
              </button>
            )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event;
              if (!over || active.id === over.id) return;
              const o = features.findIndex((i) => i.id === active.id);
              const n = features.findIndex((i) => i.id === over.id);
              if (o !== -1 && n !== -1) {
                setFeatures(arrayMove(features, o, n));
                setIsDirty(true);
              }
            }}
          >
            <SortableContext items={features.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {features.map((feat, idx) => (
                  <SortableRepeaterRow
                    key={feat.id}
                    id={feat.id}
                    label={`ميزة ${idx + 1}`}
                    canRemove={features.length > 2}
                    onRemove={() => {
                      setFeatures(features.filter((f) => f.id !== feat.id));
                      setIsDirty(true);
                    }}
                  >
                    <LocalizedField
                      label="النص"
                      value={feat.text}
                      onChange={(text) => {
                        setFeatures(features.map((f) => (f.id === feat.id ? { ...f, text } : f)));
                        setIsDirty(true);
                      }}
                      translating={saving}
                      failed={failedSet.has(`features.${idx}`)}
                      onRetryTranslate={() => handleSave([`features.${idx}`])}
                    />
                  </SortableRepeaterRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* 4. Description */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-ink">وصف الرحلة التفصيلي</h2>
          <LocalizedField
            label="التفاصيل (نص عادي بأسطر واضحة)"
            multiline
            rows={5}
            value={description}
            onChange={(v) => {
              setDescription(v);
              setIsDirty(true);
            }}
            translating={saving}
            failed={failedSet.has('description')}
            onRetryTranslate={() => handleSave(['description'])}
          />
        </section>

        {/* 5. Itinerary Days */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-ink">برنامج الرحلة يوم بيوم</h2>
              <p className="text-xs text-muted mt-0.5">اسحب الأيام لإعادة ترتيبها</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setItinerary([
                  ...itinerary,
                  { id: `day-${Date.now()}`, title: emptyLoc(), description: emptyLoc() },
                ]);
                setIsDirty(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border hover:border-brand-600 text-xs font-semibold text-ink"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة يوم</span>
            </button>
          </div>

          {itinerary.length === 0 ? (
            <p className="text-sm text-muted">لم تتم إضافة أيام للبرنامج بعد.</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                const o = itinerary.findIndex((i) => i.id === active.id);
                const n = itinerary.findIndex((i) => i.id === over.id);
                if (o !== -1 && n !== -1) {
                  setItinerary(arrayMove(itinerary, o, n));
                  setIsDirty(true);
                }
              }}
            >
              <SortableContext
                items={itinerary.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {itinerary.map((day, idx) => (
                    <SortableRepeaterRow
                      key={day.id}
                      id={day.id}
                      label={`اليوم ${idx + 1}`}
                      onRemove={() => {
                        setItinerary(itinerary.filter((d) => d.id !== day.id));
                        setIsDirty(true);
                      }}
                    >
                      <LocalizedField
                        label="عنوان اليوم"
                        required
                        value={day.title}
                        onChange={(titleVal) => {
                          setItinerary(
                            itinerary.map((d) => (d.id === day.id ? { ...d, title: titleVal } : d))
                          );
                          setIsDirty(true);
                        }}
                        translating={saving}
                        failed={failedSet.has(`itinerary.${idx}.title`)}
                        onRetryTranslate={() => handleSave([`itinerary.${idx}.title`])}
                      />
                      <LocalizedField
                        label="وصف اليوم"
                        multiline
                        rows={2}
                        value={day.description}
                        onChange={(descVal) => {
                          setItinerary(
                            itinerary.map((d) =>
                              d.id === day.id ? { ...d, description: descVal } : d
                            )
                          );
                          setIsDirty(true);
                        }}
                        translating={saving}
                        failed={failedSet.has(`itinerary.${idx}.description`)}
                        onRetryTranslate={() => handleSave([`itinerary.${idx}.description`])}
                      />
                    </SortableRepeaterRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        {/* 6. Optional Activities */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-ink">الأنشطة الاختيارية للرحلة</h2>
              <p className="text-xs text-muted mt-0.5">تتبع الرحلة ككل (مجاني أو بمصاريف إضافية)</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActivities([
                  ...activities,
                  {
                    id: `act-${Date.now()}`,
                    title: emptyLoc(),
                    description: emptyLoc(),
                    pricing: 'FREE',
                    priceAmount: '',
                  },
                ]);
                setIsDirty(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border hover:border-brand-600 text-xs font-semibold text-ink"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة نشاط</span>
            </button>
          </div>

          {activities.length === 0 ? (
            <p className="text-sm text-muted">لا توجد أنشطة اختيارية مضافة.</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                const o = activities.findIndex((i) => i.id === active.id);
                const n = activities.findIndex((i) => i.id === over.id);
                if (o !== -1 && n !== -1) {
                  setActivities(arrayMove(activities, o, n));
                  setIsDirty(true);
                }
              }}
            >
              <SortableContext
                items={activities.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {activities.map((act, idx) => (
                    <SortableRepeaterRow
                      key={act.id}
                      id={act.id}
                      label={`نشاط ${idx + 1}`}
                      onRemove={() => {
                        setActivities(activities.filter((a) => a.id !== act.id));
                        setIsDirty(true);
                      }}
                    >
                      <LocalizedField
                        label="اسم النشاط"
                        required
                        value={act.title}
                        onChange={(titleVal) => {
                          setActivities(
                            activities.map((a) => (a.id === act.id ? { ...a, title: titleVal } : a))
                          );
                          setIsDirty(true);
                        }}
                        translating={saving}
                        failed={failedSet.has(`activities.${idx}.title`)}
                        onRetryTranslate={() => handleSave([`activities.${idx}.title`])}
                      />
                      <LocalizedField
                        label="وصف النشاط (اختياري)"
                        multiline
                        rows={2}
                        value={act.description}
                        onChange={(descVal) => {
                          setActivities(
                            activities.map((a) =>
                              a.id === act.id ? { ...a, description: descVal } : a
                            )
                          );
                          setIsDirty(true);
                        }}
                        translating={saving}
                        failed={failedSet.has(`activities.${idx}.description`)}
                        onRetryTranslate={() => handleSave([`activities.${idx}.description`])}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-sm font-semibold text-ink">التسعير</label>
                          <select
                            value={act.pricing}
                            onChange={(e) => {
                              const nextPricing = e.target.value as ActivityPricing;
                              setActivities(
                                activities.map((a) =>
                                  a.id === act.id
                                    ? {
                                        ...a,
                                        pricing: nextPricing,
                                        priceAmount: nextPricing === 'FREE' ? '' : a.priceAmount,
                                      }
                                    : a
                                )
                              );
                              setIsDirty(true);
                            }}
                            className={inputCls}
                          >
                            <option value="FREE">مجاني</option>
                            <option value="EXTRA_COST">بمصاريف إضافية</option>
                          </select>
                        </div>

                        {act.pricing === 'EXTRA_COST' && (
                          <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-ink">
                              التكلفة (ج.م اختياري)
                            </label>
                            <input
                              type="number"
                              min={1}
                              dir="ltr"
                              placeholder="اتركه فارغاً لإظهار 'بمصاريف إضافية' فقط"
                              value={act.priceAmount}
                              onChange={(e) => {
                                setActivities(
                                  activities.map((a) =>
                                    a.id === act.id ? { ...a, priceAmount: e.target.value } : a
                                  )
                                );
                                setIsDirty(true);
                              }}
                              className={inputCls}
                            />
                          </div>
                        )}
                      </div>
                    </SortableRepeaterRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>

      <StickySaveBar
        isDirty={isDirty}
        saving={saving}
        saveLabel={isNew ? 'إنشاء الرحلة' : 'حفظ الرحلة'}
        onSave={() => handleSave()}
      />
    </AdminLayout>
  );
}

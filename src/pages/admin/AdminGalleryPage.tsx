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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { LocalizedField } from '../../components/admin/LocalizedField';
import { ResilientImage } from '../../components/ResilientImage';
import type { GalleryImageRecord, ImageRecord, LocalizedText } from '../../shared/types';

function SortableGalleryTile({
  item,
  savingId,
  onSaveCaption,
  onDelete,
}: {
  item: GalleryImageRecord;
  savingId: string | null;
  onSaveCaption: (id: string, caption: LocalizedText, force?: boolean) => Promise<void>;
  onDelete: (item: GalleryImageRecord) => void;
}) {
  const [caption, setCaption] = useState<LocalizedText>(
    item.caption ?? { ar: '', en: '', enManual: false }
  );
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  useEffect(() => {
    setCaption(item.caption ?? { ar: '', en: '', enManual: false });
  }, [item]);

  const orig = item.caption ?? { ar: '', en: '', enManual: false };
  const dirty =
    caption.ar !== orig.ar || caption.en !== orig.en || caption.enManual !== orig.enManual;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="rounded-2xl bg-surface border border-border overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-surface-alt">
        <ResilientImage
          image={item.image}
          alt={caption.ar || ''}
          sizes="(min-width: 1024px) 25vw, 50vw"
          maxWidth={768}
          className="w-full h-full object-cover"
        />
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="اسحب لإعادة الترتيب"
          className="absolute top-2.5 start-2.5 w-8 h-8 rounded-lg bg-black/55 text-white flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          aria-label="حذف الصورة"
          className="absolute top-2.5 end-2.5 w-8 h-8 rounded-lg bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <LocalizedField
          label="التعليق (اختياري)"
          value={caption}
          onChange={setCaption}
          translating={savingId === item.id}
          onRetryTranslate={() => onSaveCaption(item.id, { ...caption, enManual: false }, true)}
        />

        {dirty && (
          <button
            type="button"
            disabled={savingId === item.id}
            onClick={() => onSaveCaption(item.id, caption)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
          >
            {savingId === item.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>حفظ التعليق</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminGalleryPage() {
  const { adminData, adminFetch, refreshAdminData } = useAdminAuth();
  const [items, setItems] = useState<GalleryImageRecord[]>([]);
  const [pendingImages, setPendingImages] = useState<ImageRecord[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryImageRecord | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (adminData?.galleryImages) {
      setItems(adminData.galleryImages);
    }
  }, [adminData]);

  const handleBulkUpload = async (uploaded: ImageRecord[]) => {
    if (uploaded.length === 0) return;
    setPendingImages([]);
    const res = await adminFetch('/api/admin/gallery', {
      method: 'POST',
      body: JSON.stringify({ imageIds: uploaded.map((u) => u.id) }),
    });
    if (res.ok) {
      await refreshAdminData();
      toast.success('تمت إضافة الصور إلى المعرض');
    } else {
      toast.error('تعذر إضافة الصور إلى المعرض');
    }
  };

  const handleSaveCaption = async (
    id: string,
    caption: LocalizedText,
    forceTranslate = false
  ) => {
    setSavingId(id);
    try {
      const res = await adminFetch(`/api/admin/gallery/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ caption, forceTranslate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'تعذر الحفظ');
      await refreshAdminData();
      if (json.failedFields?.length) {
        toast.warning('تم الحفظ ولكن تعذرت الترجمة التلقائية');
      } else {
        toast.success('تم حفظ التعليق');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSavingId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    const res = await adminFetch('/api/admin/gallery/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds: next.map((i) => i.id) }),
    });
    if (res.ok) {
      await refreshAdminData();
      toast.success('تم تحديث ترتيب المعرض');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const res = await adminFetch(`/api/admin/gallery/${target.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshAdminData();
      toast.success('تم حذف الصورة');
    } else {
      toast.error('تعذر حذف الصورة');
    }
  };

  return (
    <AdminLayout title="معرض الصور" subtitle="رفع الصور الجماعي، إعادة الترتيب، وإضافة تعليقات">
      <div className="space-y-8">
        <div className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-extrabold text-ink">إضافة صور جديدة للمعرض</h2>
          <ImageUploader
            images={pendingImages}
            onChange={handleBulkUpload}
            multiple
            folder="everyday/gallery"
          />
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center text-muted">
            لا توجد صور في المعرض بعد.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item) => (
                  <SortableGalleryTile
                    key={item.id}
                    item={item}
                    savingId={savingId}
                    onSaveCaption={handleSaveCaption}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف الصورة"
        description="هل تريد حذف هذه الصورة من المعرض نهائياً؟"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}

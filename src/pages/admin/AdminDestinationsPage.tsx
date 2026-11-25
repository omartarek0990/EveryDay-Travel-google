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
import { GripVertical, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { LocalizedField } from '../../components/admin/LocalizedField';
import type { DestinationRecord, LocalizedText } from '../../shared/types';

function SortableDestinationRow({
  dest,
  onSave,
  onDelete,
  savingId,
}: {
  dest: DestinationRecord;
  onSave: (id: string, name: LocalizedText, isActive: boolean, force?: boolean) => Promise<void>;
  onDelete: (dest: DestinationRecord) => void;
  savingId: string | null;
}) {
  const [name, setName] = useState<LocalizedText>(dest.name);
  const [isActive, setIsActive] = useState(dest.isActive);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: dest.id });

  useEffect(() => {
    setName(dest.name);
    setIsActive(dest.isActive);
  }, [dest]);

  const dirty =
    name.ar !== dest.name.ar ||
    name.en !== dest.name.en ||
    name.enManual !== dest.name.enManual ||
    isActive !== dest.isActive;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="rounded-2xl bg-surface border border-border p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="اسحب لإعادة الترتيب"
            className="p-2 rounded-lg hover:bg-surface-alt text-muted cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-muted" dir="ltr">
            /{dest.slug}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-brand-600 rounded"
            />
            <span>مفعّلة</span>
          </label>
          <button
            type="button"
            onClick={() => onDelete(dest)}
            aria-label="حذف الوجهة"
            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <LocalizedField
        label="اسم الوجهة"
        value={name}
        onChange={setName}
        translating={savingId === dest.id}
        onRetryTranslate={() => onSave(dest.id, { ...name, enManual: false }, isActive, true)}
      />

      {dirty && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={savingId === dest.id}
            onClick={() => onSave(dest.id, name, isActive)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-semibold"
          >
            {savingId === dest.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>حفظ الوجهة</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminDestinationsPage() {
  const { adminData, adminFetch, refreshAdminData } = useAdminAuth();
  const [items, setItems] = useState<DestinationRecord[]>([]);
  const [newName, setNewName] = useState<LocalizedText>({ ar: '', en: '', enManual: false });
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DestinationRecord | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (adminData?.destinations) {
      setItems(adminData.destinations);
    }
  }, [adminData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.ar.trim()) {
      toast.error('أدخل اسم الوجهة بالعربية');
      return;
    }
    setCreating(true);
    try {
      const res = await adminFetch('/api/admin/destinations', {
        method: 'POST',
        body: JSON.stringify({ name: newName, isActive: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'تعذر إضافة الوجهة');
      setNewName({ ar: '', en: '', enManual: false });
      await refreshAdminData();
      if (json.failedFields?.length) {
        toast.warning('تم حفظ الوجهة ولكن تعذرت الترجمة التلقائية');
      } else {
        toast.success('تمت إضافة الوجهة');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الإضافة');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (
    id: string,
    name: LocalizedText,
    isActive: boolean,
    forceTranslate = false
  ) => {
    setSavingId(id);
    try {
      const res = await adminFetch(`/api/admin/destinations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, isActive, forceTranslate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'تعذر التحديث');
      await refreshAdminData();
      if (json.failedFields?.length) {
        toast.warning('تم الحفظ ولكن تعذرت الترجمة التلقائية');
      } else {
        toast.success('تم حفظ الوجهة');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل التحديث');
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
    const res = await adminFetch('/api/admin/destinations/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds: next.map((i) => i.id) }),
    });
    if (res.ok) {
      await refreshAdminData();
      toast.success('تم تحديث الترتيب');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const res = await adminFetch(`/api/admin/destinations/${target.id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || 'تعذر حذف الوجهة');
      return;
    }
    await refreshAdminData();
    toast.success('تم حذف الوجهة');
  };

  return (
    <AdminLayout title="الوجهات" subtitle="إدارة الوجهات السياحية المتاحة للرحلات">
      <div className="space-y-8">
        {/* Add New Destination */}
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-surface border border-border p-6 space-y-4"
        >
          <h2 className="text-base font-extrabold text-ink">إضافة وجهة جديدة</h2>
          <LocalizedField
            label="اسم الوجهة"
            value={newName}
            onChange={setNewName}
            placeholder="مثال: مرسى علم"
            translating={creating}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>إضافة الوجهة</span>
            </button>
          </div>
        </form>

        {/* Destinations List */}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center text-muted">
            لا توجد وجهات مضافة بعد.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {items.map((dest) => (
                  <SortableDestinationRow
                    key={dest.id}
                    dest={dest}
                    onSave={handleSave}
                    onDelete={setDeleteTarget}
                    savingId={savingId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف الوجهة"
        description={`هل تريد حذف وجهة "${deleteTarget?.name.ar}"؟ لا يمكن الحذف إذا كانت مرتبطة برحلات.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}

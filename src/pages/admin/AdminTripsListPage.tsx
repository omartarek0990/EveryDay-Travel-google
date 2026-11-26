import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Edit3, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { ResilientImage } from '../../components/ResilientImage';
import { formatTripPrice } from '../../shared/format';
import type { TripStatus, TripWithRelations } from '../../shared/types';

const STATUS_LABELS: Record<TripStatus, { label: string; cls: string }> = {
  PUBLISHED: { label: 'منشورة', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  DRAFT: { label: 'مسودة', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  HIDDEN: { label: 'مخفية', cls: 'bg-surface-alt text-muted border-border' },
};

function SortableTripRow({
  trip,
  onTogglePublish,
  onDelete,
}: {
  trip: TripWithRelations;
  onTogglePublish: (trip: TripWithRelations) => void;
  onDelete: (trip: TripWithRelations) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: trip.id });
  const cover = trip.images[0]?.image?.url;
  const statusInfo = STATUS_LABELS[trip.status];

  const priceText = formatTripPrice(
    {
      priceAmount: trip.priceAmount,
      pricePrefix: trip.pricePrefix,
      priceUnit: trip.priceUnit,
    },
    'ar',
    {
      startingFrom: 'ابتداءً من',
      perPerson: 'للفرد',
      perTrip: 'للرحلة',
      contactForPrice: 'بدون سعر محدد',
    }
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="rounded-2xl bg-surface border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="اسحب لإعادة الترتيب"
          className="p-2 rounded-lg hover:bg-surface-alt text-muted cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="w-20 aspect-[4/3] rounded-xl overflow-hidden bg-surface-alt shrink-0 border border-border">
          <ResilientImage
            image={trip.images[0]?.image ?? undefined}
            src={cover}
            alt={trip.title.ar}
            sizes="80px"
            maxWidth={480}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
            {trip.destination && (
              <span className="text-xs text-muted font-medium">{trip.destination.name.ar}</span>
            )}
          </div>
          <Link
            to={`/admin/trips/${trip.id}`}
            className="text-base font-bold text-ink hover:text-brand-600 line-clamp-1"
          >
            {trip.title.ar}
          </Link>
          <p className="text-xs text-muted tabular-nums mt-0.5">{priceText}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button
          type="button"
          onClick={() => onTogglePublish(trip)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border hover:bg-surface-alt text-xs font-semibold text-ink"
        >
          {trip.status === 'PUBLISHED' ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>إخفاء</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>نشر</span>
            </>
          )}
        </button>

        <Link
          to={`/admin/trips/${trip.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-alt hover:bg-brand-100 hover:text-brand-700 text-xs font-semibold text-ink"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>تعديل</span>
        </Link>

        <button
          type="button"
          onClick={() => onDelete(trip)}
          aria-label="حذف الرحلة"
          className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function AdminTripsListPage() {
  const { adminData, adminFetch, refreshAdminData } = useAdminAuth();
  const [trips, setTrips] = useState<TripWithRelations[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TripWithRelations | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (adminData?.trips) {
      setTrips(adminData.trips);
    }
  }, [adminData]);

  const handleTogglePublish = async (trip: TripWithRelations) => {
    const nextStatus: TripStatus = trip.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
    const previous = trips;
    // Optimistic: show the new state before the round-trip completes.
    setTrips((current) =>
      current.map((item) => (item.id === trip.id ? { ...item, status: nextStatus } : item))
    );
    try {
      const res = await adminFetch(`/api/admin/trips/${trip.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'تعذر تغيير حالة الرحلة');
      toast.success(nextStatus === 'PUBLISHED' ? 'تم نشر الرحلة على الموقع' : 'تم إخفاء الرحلة');
      await refreshAdminData();
    } catch (error) {
      setTrips(previous);
      toast.error(error instanceof Error ? error.message : 'تعذر تغيير حالة الرحلة');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = trips.findIndex((t) => t.id === active.id);
    const newIdx = trips.findIndex((t) => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const previous = trips;
    const next = arrayMove(trips, oldIdx, newIdx);
    setTrips(next);
    try {
      const res = await adminFetch('/api/admin/trips/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ orderedIds: next.map((t) => t.id) }),
      });
      if (!res.ok) throw new Error('تعذر تحديث ترتيب الرحلات');
      toast.success('تم تحديث ترتيب الرحلات');
      await refreshAdminData();
    } catch (error) {
      setTrips(previous);
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث ترتيب الرحلات');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const res = await adminFetch(`/api/admin/trips/${target.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshAdminData();
      toast.success('تم حذف الرحلة');
    } else {
      toast.error('تعذر حذف الرحلة');
    }
  };

  return (
    <AdminLayout
      title="الرحلات"
      subtitle="اسحب الرحلات لتحديد ترتيب ظهورها في الصفحة الرئيسية وصفحة الرحلات"
      action={
        <Link
          to="/admin/trips/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة رحلة</span>
        </Link>
      }
    >
      {trips.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-4">
          <p className="text-muted">لا توجد رحلات مضافة بعد.</p>
          <Link
            to="/admin/trips/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>أنشئ أول رحلة</span>
          </Link>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={trips.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {trips.map((trip) => (
                <SortableTripRow
                  key={trip.id}
                  trip={trip}
                  onTogglePublish={handleTogglePublish}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف الرحلة"
        description={`هل تريد حذف رحلة "${deleteTarget?.title.ar}"؟ سيتم حذف صورها غير المستخدمة أيضاً.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}

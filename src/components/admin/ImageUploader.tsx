import React, { useRef, useState } from 'react';
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
import { GripVertical, RefreshCw, Trash2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImageWithProgress, validateImageFile } from '../../lib/image-upload';
import type { ImageRecord } from '../../shared/types';
import { ResilientImage } from '../ResilientImage';
import { useAdminAuth } from './AdminAuthContext';

interface UploadQueueItem {
  localId: string;
  file: File;
  progress: number;
  status: 'queued' | 'uploading' | 'error';
  error?: string;
  controller?: AbortController;
}

function SortableThumb({
  image,
  isCover,
  onRemove,
}: {
  image: ImageRecord;
  isCover: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-xl border border-border bg-surface overflow-hidden"
    >
      <div className="aspect-[4/3] bg-surface-alt">
        <ResilientImage src={image.url} alt="" className="w-full h-full object-cover" />
      </div>

      {isCover && (
        <span className="absolute top-2 start-2 px-2 py-0.5 rounded-md bg-brand-600 text-white text-[11px] font-bold">
          الغلاف
        </span>
      )}

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="اسحب لإعادة الترتيب"
        className="absolute top-2 end-2 w-7 h-7 rounded-lg bg-black/55 text-white flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onRemove}
        aria-label="إزالة الصورة"
        className="absolute bottom-2 end-2 w-7 h-7 rounded-lg bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ImageUploader({
  images,
  onChange,
  multiple = true,
  maxImages,
  showCoverBadge = false,
  folder = 'everyday',
}: {
  images: ImageRecord[];
  onChange: (next: ImageRecord[]) => void;
  multiple?: boolean;
  maxImages?: number;
  showCoverBadge?: boolean;
  folder?: string;
}) {
  const { token } = useAdminAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const activeUploadsRef = useRef(0);
  const queueRef = useRef<UploadQueueItem[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const syncQueue = (updater: (prev: UploadQueueItem[]) => UploadQueueItem[]) => {
    setQueue((prev) => {
      const next = updater(prev);
      queueRef.current = next;
      return next;
    });
  };

  const pumpQueue = () => {
    while (activeUploadsRef.current < 3) {
      const nextItem = queueRef.current.find((q) => q.status === 'queued');
      if (!nextItem) break;

      activeUploadsRef.current += 1;
      const controller = new AbortController();
      syncQueue((prev) =>
        prev.map((q) =>
          q.localId === nextItem.localId ? { ...q, status: 'uploading', controller, error: undefined } : q
        )
      );

      uploadImageWithProgress({
        file: nextItem.file,
        folder,
        authToken: token,
        signal: controller.signal,
        onProgress: (pct) => {
          syncQueue((prev) =>
            prev.map((q) => (q.localId === nextItem.localId ? { ...q, progress: pct } : q))
          );
        },
      })
        .then((uploaded) => {
          syncQueue((prev) => prev.filter((q) => q.localId !== nextItem.localId));
          onChange(multiple ? [...imagesRef.current, uploaded] : [uploaded]);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') {
            syncQueue((prev) => prev.filter((q) => q.localId !== nextItem.localId));
          } else {
            syncQueue((prev) =>
              prev.map((q) =>
                q.localId === nextItem.localId
                  ? { ...q, status: 'error', error: err?.message || 'فشل الرفع' }
                  : q
              )
            );
          }
        })
        .finally(() => {
          activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
          pumpQueue();
        });
    }
  };

  const imagesRef = useRef(images);
  imagesRef.current = images;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    let files = Array.from(fileList);
    if (!multiple) files = files.slice(0, 1);
    if (maxImages) {
      const remaining = Math.max(0, maxImages - images.length);
      if (remaining === 0) {
        toast.error(`الحد الأقصى للصور هو ${maxImages}`);
        return;
      }
      files = files.slice(0, remaining);
    }

    const newItems: UploadQueueItem[] = [];
    for (const file of files) {
      const err = validateImageFile(file);
      if (err) {
        toast.error(`${file.name}: ${err}`);
        continue;
      }
      newItems.push({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        progress: 0,
        status: 'queued',
      });
    }

    if (newItems.length > 0) {
      syncQueue((prev) => [...prev, ...newItems]);
      setTimeout(pumpQueue, 0);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = images.findIndex((i) => i.id === active.id);
    const newIdx = images.findIndex((i) => i.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      onChange(arrayMove(images, oldIdx, newIdx));
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border hover:border-brand-600 rounded-2xl bg-surface-alt/60 p-6 text-center cursor-pointer transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <UploadCloud className="w-8 h-8 text-brand-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-ink">
          اضغط لاختيار {multiple ? 'صور' : 'صورة'} أو اسحبها هنا
        </p>
        <p className="text-xs text-muted mt-1">
          JPEG, PNG, WebP, HEIC · بحد أقصى 25 ميجابايت للصورة (يتم تصغيرها تلقائياً قبل الرفع)
        </p>
      </div>

      {/* Active / Failed Queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item) => (
            <div
              key={item.localId}
              className="rounded-xl border border-border bg-surface p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span className="truncate">{item.file.name}</span>
                  <span className="tabular-nums text-muted">{item.progress}%</span>
                </div>
                {item.status === 'error' ? (
                  <p className="text-xs text-red-600">{item.error}</p>
                ) : (
                  <div className="h-1.5 w-full rounded-full bg-surface-alt overflow-hidden">
                    <div
                      className="h-full bg-brand-600 transition-all duration-150"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {item.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => {
                      syncQueue((prev) =>
                        prev.map((q) =>
                          q.localId === item.localId
                            ? { ...q, status: 'queued', progress: 0, error: undefined }
                            : q
                        )
                      );
                      setTimeout(pumpQueue, 0);
                    }}
                    aria-label="إعادة المحاولة"
                    className="p-1.5 rounded-lg hover:bg-surface-alt text-brand-600"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    item.controller?.abort();
                    syncQueue((prev) => prev.filter((q) => q.localId !== item.localId));
                  }}
                  aria-label="إلغاء"
                  className="p-1.5 rounded-lg hover:bg-surface-alt text-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Images Grid with Drag-to-Reorder */}
      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <SortableThumb
                  key={img.id}
                  image={img}
                  isCover={showCoverBadge && idx === 0}
                  onRemove={() => onChange(images.filter((i) => i.id !== img.id))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

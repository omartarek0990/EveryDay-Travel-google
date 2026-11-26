import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useI18n } from '../I18nProvider';
import type { ImageRecord } from '../../shared/types';
import { ResilientImage } from '../ResilientImage';

export interface LightboxItem {
  url: string;
  alt: string;
  caption?: string;
  captionIsFallbackAr?: boolean;
  /** Full image record, so the largest variant can be requested. */
  image?: ImageRecord | null;
}

export function Lightbox({
  items,
  activeIndex,
  onClose,
  onChangeIndex,
}: {
  items: LightboxItem[];
  activeIndex: number | null;
  onClose: () => void;
  onChangeIndex: (nextIndex: number) => void;
}) {
  const { dir, messages } = useI18n();
  const touchStartX = useRef<number | null>(null);

  const isOpen = activeIndex !== null && activeIndex >= 0 && activeIndex < items.length;
  const total = items.length;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (total <= 1) return;
      if (e.key === 'ArrowRight') {
        onChangeIndex(dir === 'rtl' ? (activeIndex! - 1 + total) % total : (activeIndex! + 1) % total);
      }
      if (e.key === 'ArrowLeft') {
        onChangeIndex(dir === 'rtl' ? (activeIndex! + 1) % total : (activeIndex! - 1 + total) % total);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, activeIndex, total, dir, onClose, onChangeIndex]);

  if (!isOpen) return null;
  const current = items[activeIndex!];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/92 flex flex-col items-center justify-center p-4"
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || total <= 1) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) > 40) {
          const forward = dir === 'rtl' ? dx > 0 : dx < 0;
          onChangeIndex(forward ? (activeIndex! + 1) % total : (activeIndex! - 1 + total) % total);
        }
      }}
    >
      <div className="w-full max-w-5xl flex items-center justify-between text-white pb-3" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-medium tabular-nums text-white/80">
          {activeIndex! + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={messages.actions.close}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="relative w-full max-w-5xl flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {total > 1 && (
          <button
            type="button"
            onClick={() => onChangeIndex((activeIndex! - 1 + total) % total)}
            aria-label={messages.actions.previous}
            className="absolute start-2 sm:-start-14 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
          >
            {dir === 'rtl' ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
          </button>
        )}

        <div className="max-h-[75vh] w-full flex items-center justify-center">
          <ResilientImage
            image={current.image}
            src={current.url}
            alt={current.alt}
            loading="eager"
            sizes="100vw"
            maxWidth={2000}
            className="max-h-[75vh] max-w-full w-auto h-auto object-contain rounded-xl"
          />
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={() => onChangeIndex((activeIndex! + 1) % total)}
            aria-label={messages.actions.next}
            className="absolute end-2 sm:-end-14 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
          >
            {dir === 'rtl' ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
          </button>
        )}
      </div>

      {current.caption && (
        <p
          lang={current.captionIsFallbackAr ? 'ar' : undefined}
          dir={current.captionIsFallbackAr ? 'rtl' : undefined}
          onClick={(e) => e.stopPropagation()}
          className="mt-4 text-center text-sm sm:text-base text-white/90 max-w-2xl"
        >
          {current.caption}
        </p>
      )}
    </div>
  );
}

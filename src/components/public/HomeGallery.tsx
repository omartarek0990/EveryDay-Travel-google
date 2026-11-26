import React, { Suspense, lazy, useState } from 'react';
import { useI18n } from '../I18nProvider';
import { usePublicData } from '../PublicDataContext';
import { ResilientImage } from '../ResilientImage';
import type { GalleryImageRecord } from '../../shared/types';
import type { LightboxItem } from './Lightbox';

// Only downloaded when a visitor actually opens a photo.
const Lightbox = lazy(() => import('./Lightbox').then((module) => ({ default: module.Lightbox })));

const GALLERY_PAGE_SIZE = 9;

/**
 * Owns the gallery pagination and the lightbox state, so opening or closing a
 * photo never re-renders the rest of the home page.
 */
export function HomeGallery({ items }: { items: GalleryImageRecord[] }) {
  const { t, messages } = useI18n();
  const { data } = usePublicData();
  const companyName = data ? t(data.settings.companyName).text : '';
  const [visibleCount, setVisibleCount] = useState(GALLERY_PAGE_SIZE);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const shown = items.slice(0, visibleCount);
  const hasMore = items.length > visibleCount;

  const lightboxItems: LightboxItem[] = items.map((item) => {
    const caption = item.caption ? t(item.caption) : null;
    return {
      url: item.image?.url || '',
      alt: caption?.text || companyName,
      caption: caption?.text,
      captionIsFallbackAr: caption?.isFallbackAr,
      image: item.image ?? null,
    };
  });

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {shown.map((item, idx) => {
          const caption = item.caption ? t(item.caption) : null;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightboxIdx(idx)}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-surface border border-border text-start"
            >
              <ResilientImage
                image={item.image}
                alt={caption?.text || ''}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                maxWidth={1200}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              {caption?.text && (
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                  <p
                    lang={caption.isFallbackAr ? 'ar' : undefined}
                    dir={caption.isFallbackAr ? 'rtl' : undefined}
                    className="text-sm font-medium text-white line-clamp-2"
                  >
                    {caption.text}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + GALLERY_PAGE_SIZE)}
            className="px-6 py-3 rounded-xl border border-border bg-surface hover:bg-surface-alt text-ink font-semibold text-sm transition-colors"
          >
            {messages.actions.showMore}
          </button>
        </div>
      )}

      {lightboxIdx !== null && (
        <Suspense fallback={null}>
          <Lightbox
            items={lightboxItems}
            activeIndex={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            onChangeIndex={(next) => setLightboxIdx(next)}
          />
        </Suspense>
      )}
    </>
  );
}

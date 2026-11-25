import React, { useState } from 'react';
import { useI18n } from '../../components/I18nProvider';
import { usePublicData } from '../../components/PublicDataContext';
import { Lightbox, type LightboxItem } from '../../components/public/Lightbox';
import { PublicLayout } from '../../components/public/PublicLayout';
import { SeoHead } from '../../components/public/SeoHead';
import { ResilientImage } from '../../components/ResilientImage';

export function GalleryPage() {
  const { messages, t } = useI18n();
  const { data, loading } = usePublicData();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (loading || !data) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="aspect-[4/3] rounded-2xl bg-surface-alt animate-pulse" />
          ))}
        </div>
      </PublicLayout>
    );
  }

  const subtitle = t(data.settings.galleryTitle);
  const companyName = t(data.settings.companyName);

  const lightboxItems: LightboxItem[] = data.galleryImages.map((item) => {
    const cap = item.caption ? t(item.caption) : null;
    return {
      url: item.image?.url || '',
      alt: cap?.text || companyName.text,
      caption: cap?.text,
      captionIsFallbackAr: cap?.isFallbackAr,
    };
  });

  return (
    <PublicLayout>
      <SeoHead title={messages.nav.gallery} description={subtitle.text} />

      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">{messages.nav.gallery}</h1>
            {subtitle.text && (
              <p
                lang={subtitle.isFallbackAr ? 'ar' : undefined}
                dir={subtitle.isFallbackAr ? 'rtl' : undefined}
                className="mt-3 text-base sm:text-lg text-muted"
              >
                {subtitle.text}
              </p>
            )}
          </div>

          {data.galleryImages.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-alt p-12 text-center text-muted">
              {messages.empty.gallery}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.galleryImages.map((item, idx) => {
                const cap = item.caption ? t(item.caption) : null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLightboxIdx(idx)}
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-surface-alt border border-border text-start"
                  >
                    <ResilientImage
                      src={item.image?.url}
                      alt={cap?.text || companyName.text}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    {cap?.text && (
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                        <p
                          lang={cap.isFallbackAr ? 'ar' : undefined}
                          dir={cap.isFallbackAr ? 'rtl' : undefined}
                          className="text-sm font-medium text-white line-clamp-2"
                        >
                          {cap.text}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Lightbox
        items={lightboxItems}
        activeIndex={lightboxIdx}
        onClose={() => setLightboxIdx(null)}
        onChangeIndex={(i) => setLightboxIdx(i)}
      />
    </PublicLayout>
  );
}

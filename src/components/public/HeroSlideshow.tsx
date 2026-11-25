import React, { useEffect, useState } from 'react';
import { Check, MapPin } from 'lucide-react';
import { useI18n } from '../I18nProvider';
import type { HeroImageRecord, SiteSettings } from '../../shared/types';
import { ResilientImage } from '../ResilientImage';

export function HeroSlideshow({
  settings,
  heroImages,
}: {
  settings: SiteSettings;
  heroImages: HeroImageRecord[];
}) {
  const { dir, t } = useI18n();
  const [activeIdx, setActiveIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [transitionMode, setTransitionMode] = useState<'fade' | 'slide'>('fade');
  const [slideStage, setSlideStage] = useState<'enter' | 'active'>('active');
  const [reducedMotion, setReducedMotion] = useState(false);

  const count = heroImages.length;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Preload only the next image
  useEffect(() => {
    if (count <= 1) return;
    const nextUrl = heroImages[(activeIdx + 1) % count]?.image?.url;
    if (nextUrl) {
      const img = new Image();
      img.src = nextUrl;
    }
  }, [activeIdx, count, heroImages]);

  // Single interval for slideshow; pauses when tab is hidden; disabled if 1 image
  useEffect(() => {
    if (count <= 1) return;
    const intervalMs = Math.min(15, Math.max(3, settings.heroIntervalSeconds || 5)) * 1000;
    let step = 0;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      step += 1;
      const mode: 'fade' | 'slide' = reducedMotion ? 'fade' : step % 2 === 1 ? 'fade' : 'slide';
      setTransitionMode(mode);
      setActiveIdx((curr) => {
        const next = (curr + 1) % count;
        setPrevIdx(curr);
        return next;
      });
      if (mode === 'slide') {
        setSlideStage('enter');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setSlideStage('active'));
        });
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [count, settings.heroIntervalSeconds, reducedMotion]);

  const heroBadge = t(settings.heroBadge);
  const heroTitle = t(settings.heroTitle);
  const heroSubtitle = t(settings.heroSubtitle);
  const heroDescription = t(settings.heroDescription);

  const activeImage = heroImages[activeIdx]?.image;
  const prevImage = prevIdx !== null ? heroImages[prevIdx]?.image : null;

  // Reading direction slide start offset: LTR enters from right (+100%), RTL enters from left (-100%)
  const slideOffsetClass =
    slideStage === 'enter'
      ? dir === 'rtl'
        ? '-translate-x-full'
        : 'translate-x-full'
      : 'translate-x-0';

  return (
    <section className="relative bg-ink sm:min-h-[88vh] sm:flex sm:items-center overflow-hidden">
      {/* Mobile spacer so fixed h-20 header sits cleanly above the 16:9 hero photo */}
      <div className="h-20 sm:hidden" aria-hidden="true" />

      {/* Layer 1: Slideshow background — full 16:9 landscape on mobile, full-bleed on sm+ */}
      <div className="relative w-full aspect-[16/9] overflow-hidden sm:aspect-auto sm:absolute sm:inset-0 z-0">
        {prevImage && count > 1 && (
          <ResilientImage
            key={`prev-${prevImage.id}`}
            src={prevImage.url}
            alt={heroTitle.text}
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {activeImage ? (
          <div
            key={`active-${activeImage.id}-${activeIdx}`}
            className={`absolute inset-0 ${
              count > 1 && prevIdx !== null
                ? transitionMode === 'slide'
                  ? `transition-transform duration-700 ease-out ${slideOffsetClass}`
                  : reducedMotion
                    ? 'transition-opacity duration-150 opacity-100'
                    : 'animate-[fadeIn_700ms_ease-out]'
                : ''
            }`}
          >
            <ResilientImage
              src={activeImage.url}
              alt={heroTitle.text}
              loading="eager"
              fetchPriority="high"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-700 via-brand-600 to-ink" />
        )}
        <div
          aria-hidden="true"
          className="sm:hidden absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-ink to-transparent pointer-events-none"
        />
      </div>

      {/* Layer 2: Fixed Dark Scrim (tablet & desktop full-bleed overlay) */}
      <div
        aria-hidden="true"
        className="hidden sm:block absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(15,10,5,0.48) 0%, rgba(15,10,5,0.58) 55%, rgba(15,10,5,0.78) 100%)',
        }}
      />

      {/* Layer 3: Fixed Content (below 16:9 photo on mobile, overlaid on sm+) */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-10 sm:py-28">
        <div className="max-w-2xl text-white">
          {heroBadge.text && (
            <div
              lang={heroBadge.isFallbackAr ? 'ar' : undefined}
              dir={heroBadge.isFallbackAr ? 'rtl' : undefined}
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-100 mb-4"
            >
              <MapPin className="w-4 h-4 text-brand-500 shrink-0" aria-hidden="true" />
              <span>{heroBadge.text}</span>
            </div>
          )}

          {heroSubtitle.text && (
            <p
              lang={heroSubtitle.isFallbackAr ? 'ar' : undefined}
              dir={heroSubtitle.isFallbackAr ? 'rtl' : undefined}
              className="text-base sm:text-lg font-medium text-white/90 mb-2"
            >
              {heroSubtitle.text}
            </p>
          )}

          <h1
            lang={heroTitle.isFallbackAr ? 'ar' : undefined}
            dir={heroTitle.isFallbackAr ? 'rtl' : undefined}
            className="text-[clamp(2.25rem,4.5vw,3.75rem)] font-extrabold leading-[1.15] tracking-tight text-white [text-wrap:balance]"
          >
            {heroTitle.text}
          </h1>

          {heroDescription.text && (
            <p
              lang={heroDescription.isFallbackAr ? 'ar' : undefined}
              dir={heroDescription.isFallbackAr ? 'rtl' : undefined}
              className="mt-4 text-base sm:text-lg text-white/85 leading-relaxed max-w-xl"
            >
              {heroDescription.text}
            </p>
          )}
        </div>

        {/* Bottom 3-feature strip */}
        {settings.heroFeatures.length > 0 && (
          <div className="mt-10 pt-6 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-white/95">
            {settings.heroFeatures.slice(0, 3).map((feat, idx) => {
              const resolved = t(feat);
              return (
                <div
                  key={idx}
                  lang={resolved.isFallbackAr ? 'ar' : undefined}
                  dir={resolved.isFallbackAr ? 'rtl' : undefined}
                  className="flex items-center gap-2.5 text-sm font-medium"
                >
                  <Check className="w-4 h-4 text-brand-500 shrink-0" aria-hidden="true" />
                  <span>{resolved.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

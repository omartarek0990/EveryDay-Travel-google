import React, { useEffect, useRef, useState } from 'react';
import { Check, MapPin } from 'lucide-react';
import { useI18n } from '../I18nProvider';
import type { HeroImageRecord, SiteSettings } from '../../shared/types';
import { ResilientImage } from '../ResilientImage';
import { imageProps } from '../../lib/image-url';
import { hideAppLoader } from '../../lib/appLoader';

/** Runs `callback` when the browser is idle, with a timeout for busy devices. */
function onIdle(callback: () => void): () => void {
  const idleWindow = window as unknown as {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 2000 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }
  const handle = window.setTimeout(callback, 300);
  return () => window.clearTimeout(handle);
}

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
  const [firstImageLoaded, setFirstImageLoaded] = useState(false);
  const preloadedIdsRef = useRef<Set<string>>(new Set());
  const firstSlideImgRef = useRef<HTMLImageElement | null>(null);
  const loaderHiddenRef = useRef(false);

  const count = heroImages.length;

  /**
   * Hides the first-load loader once the eager hero image is actually painted:
   * decode() first (downloaded ≠ painted), then web fonts. The 3 s failsafe in
   * index.html covers a decode/fonts promise that never settles.
   */
  const hideLoaderWhenPainted = (img?: HTMLImageElement | null) => {
    if (loaderHiddenRef.current) return;
    loaderHiddenRef.current = true;
    const decoded = img && typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();
    void decoded.then(() => {
      const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
      if (fonts && typeof fonts.ready?.then === 'function') {
        fonts.ready.then(
          () => hideAppLoader(),
          () => hideAppLoader()
        );
        return;
      }
      hideAppLoader();
    });
  };

  // Cached reload: the image can already be complete before any load event fires.
  useEffect(() => {
    const img = firstSlideImgRef.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth === 0) {
      // Broken cached image: the loader must not stay up for this.
      if (!loaderHiddenRef.current) {
        loaderHiddenRef.current = true;
        hideAppLoader();
      }
      return;
    }
    hideLoaderWhenPainted(img);
  }, [heroImages[0]?.image?.id]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Keep the outgoing image mounted only for the length of the transition.
  useEffect(() => {
    if (prevIdx === null) return;
    const timer = window.setTimeout(() => setPrevIdx(null), reducedMotion ? 200 : 750);
    return () => window.clearTimeout(timer);
  }, [prevIdx, reducedMotion]);

  // Warm the next slide only after the first one has loaded, and only when idle.
  useEffect(() => {
    if (!firstImageLoaded || count <= 1) return;
    const nextImage = heroImages[(activeIdx + 1) % count]?.image;
    if (!nextImage || preloadedIdsRef.current.has(nextImage.id)) return;

    return onIdle(() => {
      preloadedIdsRef.current.add(nextImage.id);
      // Match the variant the browser would pick for the current viewport.
      const maxWidth = window.innerWidth < 768 ? 768 : 1200;
      const url = imageProps(nextImage, { maxWidth }).src;
      if (url) {
        const preload = new Image();
        preload.decoding = 'async';
        preload.src = url;
      }
    });
  }, [firstImageLoaded, activeIdx, count, heroImages]);

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
            image={prevImage}
            alt={heroTitle.text}
            loading="eager"
            sizes="100vw"
            maxWidth={2000}
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
              image={activeImage}
              alt={heroTitle.text}
              imgRef={activeIdx === 0 ? firstSlideImgRef : undefined}
              loading={activeIdx === 0 ? 'eager' : 'lazy'}
              fetchPriority={activeIdx === 0 ? 'high' : 'auto'}
              sizes="100vw"
              maxWidth={2000}
              onLoad={(event) => {
                if (activeIdx !== 0) return;
                setFirstImageLoaded(true);
                hideLoaderWhenPainted(event.currentTarget);
              }}
              onError={() => {
                // Broken hero image: never leave the loader covering the page.
                if (loaderHiddenRef.current) return;
                loaderHiddenRef.current = true;
                hideAppLoader();
              }}
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

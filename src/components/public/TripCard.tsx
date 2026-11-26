import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../I18nProvider';
import { buildWhatsAppUrl, formatDaysCount, formatTripPrice } from '../../shared/format';
import type { SiteSettings, TripCardData } from '../../shared/types';
import { ResilientImage } from '../ResilientImage';
import { prefetchTripDetail } from '../../lib/prefetch';
import { WhatsAppIcon } from './WhatsAppIcon';

function TripCardBase({
  trip,
  settings,
}: {
  trip: TripCardData;
  settings: SiteSettings;
}) {
  const { locale, dir, messages, t } = useI18n();
  const [slideIdx, setSlideIdx] = useState(0);
  const [loadedSet, setLoadedSet] = useState<Set<number>>(() => new Set([0]));
  const touchStartX = useRef<number | null>(null);
  const didSwipe = useRef(false);

  const images = trip.images;
  const total = images.length;
  const title = t(trip.title);
  const tagline = t(trip.tagline);
  const badge = trip.badge ? t(trip.badge) : null;
  const destName = trip.destination ? t(trip.destination.name) : null;

  const tripUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${locale}/trips/${trip.slug}`
      : `/${locale}/trips/${trip.slug}`;

  const whatsappUrl = settings.whatsapp
    ? buildWhatsAppUrl(
        settings.whatsapp,
        t(settings.whatsappMessage).text,
        title.text,
        tripUrl
      )
    : null;

  const priceText = formatTripPrice(
    {
      priceAmount: trip.priceAmount,
      pricePrefix: trip.pricePrefix,
      priceUnit: trip.priceUnit,
    },
    locale,
    {
      startingFrom: messages.trip.startingFrom,
      perPerson: messages.trip.perPerson,
      perTrip: messages.trip.perTrip,
      contactForPrice: messages.trip.contactForPrice,
    }
  );

  const goTo = (nextIdx: number) => {
    if (total <= 1) return;
    const bounded = (nextIdx + total) % total;
    setSlideIdx(bounded);
    setLoadedSet((prev) => new Set(prev).add(bounded));
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    goTo(slideIdx - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    goTo(slideIdx + 1);
  };

  return (
    <Link
      to={`/${locale}/trips/${trip.slug}`}
      onMouseEnter={prefetchTripDetail}
      onFocus={prefetchTripDetail}
      onClick={(e) => {
        if (didSwipe.current) {
          e.preventDefault();
          didSwipe.current = false;
        }
      }}
      className="group h-full flex flex-col rounded-2xl bg-surface border border-border overflow-hidden transition-shadow duration-200 hover:shadow-md"
    >
      {/* 4:3 Image Slider */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden bg-surface-alt"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
          didSwipe.current = false;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || total <= 1) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) > 36) {
            didSwipe.current = true;
            const forward = dir === 'rtl' ? dx > 0 : dx < 0;
            goTo(forward ? slideIdx + 1 : slideIdx - 1);
          }
        }}
      >
        {total > 0 ? (
          images.map((item, idx) => {
            const isActive = idx === slideIdx;
            const shouldLoad = idx === 0 || loadedSet.has(idx);
            return (
              <div
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-200 ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {shouldLoad && (
                  <ResilientImage
                    image={item.image}
                    alt={title.text}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    maxWidth={1200}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                )}
              </div>
            );
          })
        ) : (
          <ResilientImage src={null} alt={title.text} className="w-full h-full" aspectClass="aspect-[4/3]" />
        )}

        {/* Scrim */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-black/80 via-black/25 to-black/10"
        />

        {/* Optional top-start badge */}
        {badge && badge.text && (
          <span
            lang={badge.isFallbackAr ? 'ar' : undefined}
            dir={badge.isFallbackAr ? 'rtl' : undefined}
            className="absolute top-3 start-3 z-30 px-2.5 py-1 rounded-md bg-brand-600 text-white text-xs font-semibold shadow-sm"
          >
            {badge.text}
          </span>
        )}

        {/* Slider counter & arrows */}
        {total > 1 && (
          <>
            <span className="absolute top-3 end-3 z-30 px-2 py-0.5 rounded-md bg-black/55 text-white text-xs font-medium tabular-nums">
              {slideIdx + 1}/{total}
            </span>

            <button
              type="button"
              onClick={handlePrev}
              aria-label={messages.actions.previous}
              className="absolute top-1/2 start-2.5 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label={messages.actions.next}
              className="absolute top-1/2 end-2.5 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            <div
              className="absolute bottom-2.5 end-3 z-30 flex items-center gap-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goTo(idx);
                  }}
                  aria-label={`${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === slideIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Title over bottom-start scrim */}
        <div className="absolute bottom-3 start-3 end-14 z-30 pointer-events-none">
          {(destName?.text || trip.durationDays) && (
            <div className="flex items-center gap-1.5 text-xs text-white/85 font-medium mb-1">
              {destName?.text && <span>{destName.text}</span>}
              {destName?.text && trip.durationDays && <span aria-hidden="true">·</span>}
              {trip.durationDays && (
                <span className="tabular-nums">{formatDaysCount(trip.durationDays, locale)}</span>
              )}
            </div>
          )}
          <h3
            lang={title.isFallbackAr ? 'ar' : undefined}
            dir={title.isFallbackAr ? 'rtl' : undefined}
            className="text-lg font-bold text-white leading-snug line-clamp-2"
          >
            {title.text}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col">
        {tagline.text && (
          <p
            lang={tagline.isFallbackAr ? 'ar' : undefined}
            dir={tagline.isFallbackAr ? 'rtl' : undefined}
            className="text-sm italic text-muted leading-relaxed mb-4 line-clamp-2"
          >
            {tagline.text}
          </p>
        )}

        <ul className="space-y-2 mb-5">
          {trip.features.slice(0, 4).map((feat, idx) => {
            const f = t(feat);
            if (!f.text) return null;
            return (
              <li
                key={idx}
                lang={f.isFallbackAr ? 'ar' : undefined}
                dir={f.isFallbackAr ? 'rtl' : undefined}
                className="flex items-start gap-2 text-sm text-ink/90"
              >
                <Check className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="line-clamp-2">{f.text}</span>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-sm font-bold text-ink tabular-nums truncate">
              {priceText}
            </span>
          </div>

          {whatsappUrl ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>{messages.actions.askAboutTrip}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-alt text-brand-700 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0">
              {messages.actions.askAboutTrip}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Cards are rendered once per trip; memo keeps list re-renders cheap. */
export const TripCard = React.memo(TripCardBase);

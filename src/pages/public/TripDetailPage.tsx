import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Clock, MapPin } from 'lucide-react';
import { useI18n } from '../../components/I18nProvider';
import { usePublicData } from '../../components/PublicDataContext';
import { Lightbox, type LightboxItem } from '../../components/public/Lightbox';
import { PublicLayout } from '../../components/public/PublicLayout';
import { SeoHead } from '../../components/public/SeoHead';
import { TripCard } from '../../components/public/TripCard';
import { WhatsAppIcon } from '../../components/public/WhatsAppIcon';
import { ResilientImage } from '../../components/ResilientImage';
import {
  buildWhatsAppUrl,
  formatCurrencyEGP,
  formatDaysCount,
  formatTripPrice,
  formatWesternNumber,
} from '../../shared/format';
import { NotFoundPage } from './NotFoundPage';

export function TripDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { locale, messages, t } = useI18n();
  const { data, loading } = usePublicData();
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const trip = useMemo(
    () => data?.trips.find((tr) => tr.slug === slug) ?? null,
    [data, slug]
  );

  const similarTrips = useMemo(() => {
    if (!data || !trip) return [];
    return data.trips
      .filter((tr) => tr.id !== trip.id && tr.destinationId === trip.destinationId)
      .slice(0, 3);
  }, [data, trip]);

  if (loading || !data) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-6">
          <div className="h-[420px] rounded-2xl bg-surface-alt animate-pulse" />
          <div className="h-10 w-2/3 bg-surface-alt rounded-lg animate-pulse" />
        </div>
      </PublicLayout>
    );
  }

  if (!trip) {
    return <NotFoundPage />;
  }

  const title = t(trip.title);
  const tagline = t(trip.tagline);
  const description = t(trip.description);
  const destName = trip.destination ? t(trip.destination.name) : null;
  const badge = trip.badge ? t(trip.badge) : null;

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappUrl = data.settings.whatsapp
    ? buildWhatsAppUrl(
        data.settings.whatsapp,
        t(data.settings.whatsappMessage).text,
        title.text,
        pageUrl
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

  const lightboxItems: LightboxItem[] = trip.images.map((ti) => ({
    url: ti.image?.url || '',
    alt: title.text,
  }));

  const currentImg = trip.images[activePhotoIdx]?.image || trip.images[0]?.image;

  const tripJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: title.text,
    description: tagline.text || description.text,
    touristType: 'Domestic Travelers',
    ...(trip.priceAmount
      ? {
          offers: {
            '@type': 'Offer',
            price: trip.priceAmount,
            priceCurrency: 'EGP',
          },
        }
      : {}),
  };

  return (
    <PublicLayout hideFloatingWhatsApp>
      <SeoHead
        title={title.text}
        description={tagline.text || description.text}
        imageUrl={trip.images[0]?.image?.url}
        jsonLd={tripJsonLd}
      />

      <article className="py-8 sm:py-12 pb-24 sm:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted mb-6">
            <Link to={`/${locale}`} className="hover:text-brand-600 transition-colors">
              {messages.nav.home}
            </Link>
            <span aria-hidden="true">/</span>
            <Link to={`/${locale}/trips`} className="hover:text-brand-600 transition-colors">
              {messages.nav.trips}
            </Link>
            {destName?.text && (
              <>
                <span aria-hidden="true">/</span>
                <Link
                  to={`/${locale}/trips?dest=${trip.destination!.slug}`}
                  className="hover:text-brand-600 transition-colors"
                >
                  {destName.text}
                </Link>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Gallery Column */}
            <div className="lg:col-span-7 space-y-3">
              <button
                type="button"
                onClick={() => setLightboxIdx(activePhotoIdx)}
                className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-surface-alt border border-border block group text-start"
              >
                <ResilientImage
                  src={currentImg?.url}
                  alt={title.text}
                  loading="eager"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                />
                {badge?.text && (
                  <span
                    lang={badge.isFallbackAr ? 'ar' : undefined}
                    dir={badge.isFallbackAr ? 'rtl' : undefined}
                    className="absolute top-4 start-4 px-3 py-1 rounded-md bg-brand-600 text-white text-xs font-semibold"
                  >
                    {badge.text}
                  </span>
                )}
              </button>

              {trip.images.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                  {trip.images.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                        idx === activePhotoIdx
                          ? 'border-brand-600'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <ResilientImage
                        src={item.image?.url}
                        alt={title.text}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Summary Column */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:sticky lg:top-24 space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-2">
                    {destName?.text && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-brand-700">
                        <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{destName.text}</span>
                      </span>
                    )}
                    {destName?.text && trip.durationDays && <span aria-hidden="true">·</span>}
                    {trip.durationDays && (
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{formatDaysCount(trip.durationDays, locale)}</span>
                      </span>
                    )}
                  </div>

                  <h1
                    lang={title.isFallbackAr ? 'ar' : undefined}
                    dir={title.isFallbackAr ? 'rtl' : undefined}
                    className="text-2xl sm:text-3xl font-extrabold text-ink leading-tight [text-wrap:balance]"
                  >
                    {title.text}
                  </h1>

                  {tagline.text && (
                    <p
                      lang={tagline.isFallbackAr ? 'ar' : undefined}
                      dir={tagline.isFallbackAr ? 'rtl' : undefined}
                      className="mt-3 text-base italic text-muted leading-relaxed"
                    >
                      {tagline.text}
                    </p>
                  )}
                </div>

                {/* Price Block */}
                <div className="rounded-xl bg-surface-alt border border-border p-4">
                  <span className="text-xl sm:text-2xl font-extrabold text-ink tabular-nums">
                    {priceText}
                  </span>
                </div>

                {/* Features Checklist */}
                {trip.features.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-ink mb-3">
                      {messages.trip.featuresTitle}
                    </h2>
                    <ul className="space-y-2.5">
                      {trip.features.map((feat, idx) => {
                        const f = t(feat);
                        if (!f.text) return null;
                        return (
                          <li
                            key={idx}
                            lang={f.isFallbackAr ? 'ar' : undefined}
                            dir={f.isFallbackAr ? 'rtl' : undefined}
                            className="flex items-start gap-2.5 text-sm text-ink"
                          >
                            <Check className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>{f.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Desktop WhatsApp CTA */}
                <div className="pt-2">
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors"
                    >
                      <WhatsAppIcon className="w-5 h-5" />
                      <span>{messages.actions.askAboutTrip}</span>
                    </a>
                  ) : (
                    <Link
                      to={`/${locale}/contact`}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors"
                    >
                      <span>{messages.actions.contactUs}</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description + Itinerary + Optional Activities */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-12">
              {description.text && (
                <section>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-ink mb-4">
                    {messages.trip.detailsTitle}
                  </h2>
                  <p
                    lang={description.isFallbackAr ? 'ar' : undefined}
                    dir={description.isFallbackAr ? 'rtl' : undefined}
                    className="text-base text-ink/90 leading-relaxed whitespace-pre-line"
                  >
                    {description.text}
                  </p>
                </section>
              )}

              {trip.itinerary.length > 0 && (
                <section>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-ink mb-6">
                    {messages.trip.itinerary}
                  </h2>
                  <ol className="space-y-4">
                    {trip.itinerary.map((day, idx) => {
                      const dTitle = t(day.title);
                      const dDesc = t(day.description);
                      return (
                        <li
                          key={day.id}
                          className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2.5 py-1 rounded-md bg-brand-100 text-brand-700 text-xs font-bold tabular-nums">
                              {messages.trip.dayLabel} {formatWesternNumber(idx + 1, locale)}
                            </span>
                            <h3
                              lang={dTitle.isFallbackAr ? 'ar' : undefined}
                              dir={dTitle.isFallbackAr ? 'rtl' : undefined}
                              className="text-base sm:text-lg font-bold text-ink"
                            >
                              {dTitle.text}
                            </h3>
                          </div>
                          {dDesc.text && (
                            <p
                              lang={dDesc.isFallbackAr ? 'ar' : undefined}
                              dir={dDesc.isFallbackAr ? 'rtl' : undefined}
                              className="text-sm sm:text-base text-muted leading-relaxed whitespace-pre-line"
                            >
                              {dDesc.text}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              {trip.optionalActivities.length > 0 && (
                <section>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-ink mb-6">
                    {messages.trip.optionalActivities}
                  </h2>
                  <div className="space-y-4">
                    {trip.optionalActivities.map((act) => {
                      const aTitle = t(act.title);
                      const aDesc = t(act.description);
                      const isFree = act.pricing === 'FREE';
                      const priceLabel = isFree
                        ? messages.trip.free
                        : act.priceAmount
                          ? `${messages.trip.extraCost} · ${formatCurrencyEGP(act.priceAmount, locale)}`
                          : messages.trip.extraCost;

                      return (
                        <div
                          key={act.id}
                          className="rounded-2xl border border-border bg-surface-alt p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <h3
                              lang={aTitle.isFallbackAr ? 'ar' : undefined}
                              dir={aTitle.isFallbackAr ? 'rtl' : undefined}
                              className="text-base font-bold text-ink"
                            >
                              {aTitle.text}
                            </h3>
                            {aDesc.text && (
                              <p
                                lang={aDesc.isFallbackAr ? 'ar' : undefined}
                                dir={aDesc.isFallbackAr ? 'rtl' : undefined}
                                className="mt-1 text-sm text-muted whitespace-pre-line"
                              >
                                {aDesc.text}
                              </p>
                            )}
                          </div>

                          <span
                            className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap shrink-0 self-start sm:self-center tabular-nums ${
                              isFree
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-brand-100 text-brand-700'
                            }`}
                          >
                            {priceLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Similar Trips */}
          {similarTrips.length > 0 && (
            <section className="mt-16 pt-12 border-t border-border">
              <h2 className="text-2xl font-extrabold text-ink mb-8">
                {messages.trip.similarTrips}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {similarTrips.map((sim) => (
                  <TripCard key={sim.id} trip={sim} settings={data.settings} />
                ))}
              </div>
            </section>
          )}
        </div>
      </article>

      {/* Mobile Sticky Bottom Bar (<= 15% viewport height) */}
      <div className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-surface/95 backdrop-blur-sm border-t border-border px-4 py-2.5 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-ink tabular-nums truncate">{priceText}</span>
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>{messages.actions.askAboutTrip}</span>
          </a>
        ) : (
          <Link
            to={`/${locale}/contact`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <span>{messages.actions.contactUs}</span>
          </Link>
        )}
      </div>

      <Lightbox
        items={lightboxItems}
        activeIndex={lightboxIdx}
        onClose={() => setLightboxIdx(null)}
        onChangeIndex={(i) => setLightboxIdx(i)}
      />
    </PublicLayout>
  );
}

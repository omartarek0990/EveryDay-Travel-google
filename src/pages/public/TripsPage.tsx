import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../../components/I18nProvider';
import { usePublicData } from '../../components/PublicDataContext';
import { PublicLayout } from '../../components/public/PublicLayout';
import { SeoHead } from '../../components/public/SeoHead';
import { TripCard } from '../../components/public/TripCard';

const PAGE_SIZE = 12;

export function TripsPage() {
  const { messages, t } = useI18n();
  const { data, loading } = usePublicData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const selectedDestSlug = searchParams.get('dest') || 'all';

  const filteredTrips = useMemo(() => {
    if (!data) return [];
    if (selectedDestSlug === 'all') return data.trips;
    return data.trips.filter((trip) => trip.destination?.slug === selectedDestSlug);
  }, [data, selectedDestSlug]);

  const handleSelectDest = (slug: string) => {
    setVisibleCount(PAGE_SIZE);
    if (slug === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ dest: slug });
    }
  };

  if (loading || !data) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="h-10 w-48 bg-surface-alt rounded-lg animate-pulse mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-96 rounded-2xl bg-surface-alt animate-pulse" />
            ))}
          </div>
        </div>
      </PublicLayout>
    );
  }

  const intro = t(data.settings.tripsIntro);
  const shownTrips = filteredTrips.slice(0, visibleCount);
  const hasMore = filteredTrips.length > visibleCount;

  return (
    <PublicLayout>
      <SeoHead title={messages.nav.trips} description={intro.text} />

      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">{messages.nav.trips}</h1>
            {intro.text && (
              <p
                lang={intro.isFallbackAr ? 'ar' : undefined}
                dir={intro.isFallbackAr ? 'rtl' : undefined}
                className="mt-3 text-base sm:text-lg text-muted leading-relaxed"
              >
                {intro.text}
              </p>
            )}
          </div>

          {/* Destination Filter Controls */}
          <div
            role="tablist"
            aria-label={messages.trip.destination}
            className="flex flex-wrap items-center gap-2 mb-10"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedDestSlug === 'all'}
              onClick={() => handleSelectDest('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedDestSlug === 'all'
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-alt text-ink hover:bg-brand-100 hover:text-brand-700 border border-border'
              }`}
            >
              {messages.actions.all}
            </button>

            {data.destinations.map((dest) => {
              const name = t(dest.name);
              const isSelected = selectedDestSlug === dest.slug;
              return (
                <button
                  key={dest.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  lang={name.isFallbackAr ? 'ar' : undefined}
                  dir={name.isFallbackAr ? 'rtl' : undefined}
                  onClick={() => handleSelectDest(dest.slug)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : 'bg-surface-alt text-ink hover:bg-brand-100 hover:text-brand-700 border border-border'
                  }`}
                >
                  {name.text}
                </button>
              );
            })}
          </div>

          {shownTrips.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-alt p-12 text-center">
              <p className="text-base font-medium text-muted">
                {selectedDestSlug === 'all' ? messages.trip.noTripsYet : messages.trip.noTripsInDest}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shownTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} settings={data.settings} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="px-6 py-3 rounded-xl border border-border bg-surface hover:bg-surface-alt text-ink font-semibold text-sm transition-colors"
                  >
                    {messages.actions.showMore}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { useI18n } from '../../components/I18nProvider';
import { usePublicData } from '../../components/PublicDataContext';
import { AboutHighlightsBanner } from '../../components/public/AboutHighlightsBanner';
import { HeroSlideshow } from '../../components/public/HeroSlideshow';
import { HomeGallery } from '../../components/public/HomeGallery';
import { PublicLayout } from '../../components/public/PublicLayout';
import { SeoHead } from '../../components/public/SeoHead';
import { TripCard } from '../../components/public/TripCard';
import { WhatsAppIcon } from '../../components/public/WhatsAppIcon';
import { buildWhatsAppUrl, isSafeExternalHttpsUrl } from '../../shared/format';
import { prefetchTripDetail } from '../../lib/prefetch';

const TRIPS_PAGE_SIZE = 12;

export function HomePage() {
  const { messages, t } = useI18n();
  const { data, loading } = usePublicData();
  const location = useLocation();
  const [selectedDestSlug, setSelectedDestSlug] = useState<string>('all');
  const [visibleTripsCount, setVisibleTripsCount] = useState<number>(TRIPS_PAGE_SIZE);

  // Warm the trip detail chunk once the landing page is idle.
  useEffect(() => {
    const idleWindow = window as unknown as {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(() => prefetchTripDetail(), { timeout: 3000 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }
    const handle = window.setTimeout(prefetchTripDetail, 1500);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (loading || !data || !location.hash) return;
    const targetId = location.hash.replace(/^#/, '');
    if (!targetId || targetId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const raf = requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [loading, data, location.hash]);

  const filteredTrips = useMemo(() => {
    if (!data) return [];
    if (selectedDestSlug === 'all') return data.trips;
    return data.trips.filter((trip) => trip.destination?.slug === selectedDestSlug);
  }, [data, selectedDestSlug]);

  if (loading || !data) {
    return (
      <PublicLayout transparentHeaderOnTop>
        <div className="min-h-[82vh] bg-surface-alt animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-96 rounded-2xl bg-surface-alt animate-pulse" />
          ))}
        </div>
      </PublicLayout>
    );
  }

  const { settings, heroImages, destinations } = data;
  const galleryItems = data.gallery.items;
  const galleryTotal = data.gallery.total;
  const shownTrips = filteredTrips.slice(0, visibleTripsCount);
  const hasMoreTrips = filteredTrips.length > visibleTripsCount;

  const contactIntro = t(settings.contactIntro);
  const galleryTitle = t(settings.galleryTitle);
  const tripsIntro = t(settings.tripsIntro);
  const aboutTitle = t(settings.aboutTitle);
  const aboutBody = t(settings.aboutBody);
  const address = t(settings.address);
  const companyName = t(settings.companyName);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappUrl = settings.whatsapp
    ? buildWhatsAppUrl(
        settings.whatsapp,
        t(settings.whatsappMessage).text,
        companyName.text,
        pageUrl
      )
    : null;

  const socials = [
    { label: 'Facebook', url: settings.facebookUrl },
    { label: 'Instagram', url: settings.instagramUrl },
    { label: 'TikTok', url: settings.tiktokUrl },
  ].filter((s) => s.url && isSafeExternalHttpsUrl(s.url));

  const hasAnyContact =
    Boolean(settings.phone) ||
    Boolean(whatsappUrl) ||
    Boolean(settings.email) ||
    Boolean(address.text) ||
    socials.length > 0;

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: companyName.text,
    description: t(settings.seoDescription).text,
    url: typeof window !== 'undefined' ? window.location.origin : '',
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
  };

  return (
    <PublicLayout transparentHeaderOnTop>
      <SeoHead jsonLd={orgJsonLd} />

      {/* 1. Home / Hero Section */}
      <div id="home">
        <HeroSlideshow settings={settings} heroImages={heroImages} />
      </div>

      {/* 2. Trips Section (with destination filter pills) */}
      <section id="trips" className="scroll-mt-20 md:scroll-mt-24 py-16 sm:py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
              {messages.nav.trips}
            </h2>
            {tripsIntro.text && (
              <p
                lang={tripsIntro.isFallbackAr ? 'ar' : undefined}
                dir={tripsIntro.isFallbackAr ? 'rtl' : undefined}
                className="mt-2 text-muted leading-relaxed"
              >
                {tripsIntro.text}
              </p>
            )}
          </div>

          {destinations.length > 0 && (
            <div
              role="tablist"
              aria-label={messages.trip.destination}
              className="flex flex-wrap items-center gap-2 mb-10"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedDestSlug === 'all'}
                onClick={() => {
                  setSelectedDestSlug('all');
                  setVisibleTripsCount(TRIPS_PAGE_SIZE);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  selectedDestSlug === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-alt text-ink hover:bg-brand-100 hover:text-brand-700 border border-border'
                }`}
              >
                {messages.actions.all}
              </button>

              {destinations.map((dest) => {
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
                    onClick={() => {
                      setSelectedDestSlug(dest.slug);
                      setVisibleTripsCount(TRIPS_PAGE_SIZE);
                    }}
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
          )}

          {shownTrips.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-alt p-10 text-center text-muted">
              {selectedDestSlug === 'all' ? messages.trip.noTripsYet : messages.trip.noTripsInDest}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shownTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} settings={settings} />
                ))}
              </div>

              {hasMoreTrips && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleTripsCount((c) => c + TRIPS_PAGE_SIZE)}
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

      {/* 3. Gallery Section (full gallery with Lightbox) */}
      <section
        id="gallery"
        className="cv-auto scroll-mt-20 md:scroll-mt-24 py-16 sm:py-24 bg-surface-alt border-y border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
              {messages.nav.gallery}
            </h2>
            {galleryTitle.text && (
              <p
                lang={galleryTitle.isFallbackAr ? 'ar' : undefined}
                dir={galleryTitle.isFallbackAr ? 'rtl' : undefined}
                className="mt-2 text-muted"
              >
                {galleryTitle.text}
              </p>
            )}
          </div>

          {galleryTotal === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center text-muted">
              {messages.empty.gallery}
            </div>
          ) : (
            <HomeGallery items={galleryItems} total={galleryTotal} />
          )}
        </div>
      </section>

      {/* 4. About Us Section (story + 4-pillar banner + Why everyDay) */}
      <section id="about" className="cv-auto scroll-mt-20 md:scroll-mt-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-12 sm:pb-14">
          <div className="max-w-3xl">
            <h2
              lang={aboutTitle.isFallbackAr ? 'ar' : undefined}
              dir={aboutTitle.isFallbackAr ? 'rtl' : undefined}
              className="text-2xl sm:text-3xl font-extrabold text-ink"
            >
              {aboutTitle.text || messages.nav.about}
            </h2>
            {aboutBody.text && (
              <p
                lang={aboutBody.isFallbackAr ? 'ar' : undefined}
                dir={aboutBody.isFallbackAr ? 'rtl' : undefined}
                className="mt-4 text-base sm:text-lg text-ink/90 leading-relaxed whitespace-pre-line"
              >
                {aboutBody.text}
              </p>
            )}
          </div>
        </div>

        <AboutHighlightsBanner />

        {settings.showWhyUsSection && settings.whyUsItems.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
            <h3 className="text-2xl font-extrabold text-ink mb-8">
              {messages.sections.whyEveryDay}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {settings.whyUsItems.slice(0, 4).map((item, idx) => {
                const title = t(item.title);
                const body = t(item.body);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-surface-alt border border-border p-6 sm:p-7"
                  >
                    <span className="inline-block text-xs font-bold text-brand-600 tabular-nums mb-3">
                      0{idx + 1}
                    </span>
                    <h4
                      lang={title.isFallbackAr ? 'ar' : undefined}
                      dir={title.isFallbackAr ? 'rtl' : undefined}
                      className="text-lg font-bold text-ink mb-2"
                    >
                      {title.text}
                    </h4>
                    <p
                      lang={body.isFallbackAr ? 'ar' : undefined}
                      dir={body.isFallbackAr ? 'rtl' : undefined}
                      className="text-sm text-muted leading-relaxed"
                    >
                      {body.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 5. Contact Us Section */}
      <section
        id="contact"
        className="cv-auto scroll-mt-20 md:scroll-mt-24 py-16 sm:py-24 bg-surface-alt border-t border-border"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
              {messages.nav.contact}
            </h2>
            {contactIntro.text && (
              <p
                lang={contactIntro.isFallbackAr ? 'ar' : undefined}
                dir={contactIntro.isFallbackAr ? 'rtl' : undefined}
                className="mt-3 text-base sm:text-lg text-muted leading-relaxed"
              >
                {contactIntro.text}
              </p>
            )}
          </div>

          {hasAnyContact && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-border bg-surface p-6 hover:border-brand-600 transition-colors flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                    <WhatsAppIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink">{messages.contact.whatsappLabel}</h3>
                    <p className="mt-1 text-sm text-brand-600 font-semibold">
                      {messages.actions.whatsappUs}
                    </p>
                  </div>
                </a>
              )}

              {settings.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="rounded-2xl border border-border bg-surface p-6 hover:border-brand-600 transition-colors flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink">{messages.contact.phoneLabel}</h3>
                    <p className="mt-1 text-base text-brand-600 font-semibold tabular-nums" dir="ltr">
                      {settings.phone}
                    </p>
                  </div>
                </a>
              )}

              {settings.email && (
                <a
                  href={`mailto:${settings.email}`}
                  className="rounded-2xl border border-border bg-surface p-6 hover:border-brand-600 transition-colors flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink">{messages.contact.emailLabel}</h3>
                    <p className="mt-1 text-sm text-brand-600 font-semibold break-all">
                      {settings.email}
                    </p>
                  </div>
                </a>
              )}

              {(address.text || (settings.mapUrl && isSafeExternalHttpsUrl(settings.mapUrl))) && (
                <div className="rounded-2xl border border-border bg-surface p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-ink">{messages.contact.addressLabel}</h3>
                    {address.text && (
                      <p
                        lang={address.isFallbackAr ? 'ar' : undefined}
                        dir={address.isFallbackAr ? 'rtl' : undefined}
                        className="text-sm text-muted leading-relaxed"
                      >
                        {address.text}
                      </p>
                    )}
                    {settings.mapUrl && isSafeExternalHttpsUrl(settings.mapUrl) && (
                      <a
                        href={settings.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
                      >
                        <span>{messages.actions.openInMaps}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {socials.length > 0 && (
                <div className="md:col-span-2 rounded-2xl border border-border bg-surface p-6">
                  <h3 className="text-lg font-bold text-ink mb-4">{messages.contact.socialLabel}</h3>
                  <div className="flex flex-wrap gap-3">
                    {socials.map((s) => (
                      <a
                        key={s.label}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-alt border border-border hover:border-brand-600 text-sm font-semibold text-ink transition-colors"
                      >
                        <span>{s.label}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-muted" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ready to Travel CTA card */}
          <div className="rounded-2xl bg-brand-600 text-white p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h3 className="text-2xl sm:text-3xl font-extrabold mb-3">
                {messages.sections.readyToTravel}
              </h3>
              {contactIntro.text && (
                <p
                  lang={contactIntro.isFallbackAr ? 'ar' : undefined}
                  dir={contactIntro.isFallbackAr ? 'rtl' : undefined}
                  className="text-white/90 text-base leading-relaxed"
                >
                  {contactIntro.text}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-brand-700 hover:bg-brand-100 font-semibold whitespace-nowrap transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>{messages.actions.whatsappUs}</span>
                </a>
              )}
              {settings.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold whitespace-nowrap transition-colors tabular-nums"
                  dir="ltr"
                >
                  <Phone className="w-4 h-4" />
                  <span>{settings.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

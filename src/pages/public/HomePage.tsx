import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../../components/I18nProvider';
import { usePublicData } from '../../components/PublicDataContext';
import { HeroSlideshow } from '../../components/public/HeroSlideshow';
import { PublicLayout } from '../../components/public/PublicLayout';
import { SeoHead } from '../../components/public/SeoHead';
import { TripCard } from '../../components/public/TripCard';
import { WhatsAppIcon } from '../../components/public/WhatsAppIcon';
import { ResilientImage } from '../../components/ResilientImage';
import { buildWhatsAppUrl } from '../../shared/format';

export function HomePage() {
  const { locale, messages, t } = useI18n();
  const { data, loading } = usePublicData();

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

  const { settings, heroImages, trips, galleryImages } = data;
  const latestTrips = trips.slice(0, 6);
  const previewGallery = galleryImages.slice(0, 6);
  const contactIntro = t(settings.contactIntro);
  const galleryTitle = t(settings.galleryTitle);
  const tripsIntro = t(settings.tripsIntro);
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

      <HeroSlideshow settings={settings} heroImages={heroImages} />

      {/* Latest Trips Section */}
      {settings.showTripsSection && (
        <section className="py-16 sm:py-24 bg-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
                  {messages.sections.latestTrips}
                </h2>
                {tripsIntro.text && (
                  <p
                    lang={tripsIntro.isFallbackAr ? 'ar' : undefined}
                    dir={tripsIntro.isFallbackAr ? 'rtl' : undefined}
                    className="mt-2 text-muted max-w-xl"
                  >
                    {tripsIntro.text}
                  </p>
                )}
              </div>

              <Link
                to={`/${locale}/trips`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 whitespace-nowrap shrink-0"
              >
                <span>{messages.actions.viewAllTrips}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>

            {latestTrips.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface-alt p-10 text-center text-muted">
                {messages.trip.noTripsYet}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} settings={settings} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Why everyDay Section */}
      {settings.showWhyUsSection && settings.whyUsItems.length > 0 && (
        <section className="py-16 sm:py-24 bg-surface-alt border-y border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mb-10">
              {messages.sections.whyEveryDay}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {settings.whyUsItems.slice(0, 4).map((item, idx) => {
                const title = t(item.title);
                const body = t(item.body);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-surface border border-border p-6 sm:p-7"
                  >
                    <span className="inline-block text-xs font-bold text-brand-600 tabular-nums mb-3">
                      0{idx + 1}
                    </span>
                    <h3
                      lang={title.isFallbackAr ? 'ar' : undefined}
                      dir={title.isFallbackAr ? 'rtl' : undefined}
                      className="text-lg font-bold text-ink mb-2"
                    >
                      {title.text}
                    </h3>
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
        </section>
      )}

      {/* Gallery Preview Section */}
      {settings.showGallerySection && previewGallery.length > 0 && (
        <section className="py-16 sm:py-24 bg-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
                  {messages.sections.galleryPreview}
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

              <Link
                to={`/${locale}/gallery`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 whitespace-nowrap shrink-0"
              >
                <span>{messages.sections.viewGallery}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {previewGallery.map((item) => {
                const cap = item.caption ? t(item.caption) : null;
                return (
                  <Link
                    key={item.id}
                    to={`/${locale}/gallery`}
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-surface-alt border border-border"
                  >
                    <ResilientImage
                      src={item.image?.url}
                      alt={cap?.text || companyName.text}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    {cap?.text && (
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/75 via-black/30 to-transparent">
                        <p
                          lang={cap.isFallbackAr ? 'ar' : undefined}
                          dir={cap.isFallbackAr ? 'rtl' : undefined}
                          className="text-sm font-medium text-white line-clamp-1"
                        >
                          {cap.text}
                        </p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Contact Call to Action Section */}
      {settings.showContactSection && (
        <section className="py-16 sm:py-20 bg-surface-alt border-t border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="rounded-2xl bg-brand-600 text-white p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
                  {messages.sections.readyToTravel}
                </h2>
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
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-brand-700 hover:bg-brand-100 font-semibold whitespace-nowrap transition-colors"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>{messages.actions.whatsappUs}</span>
                  </a>
                ) : (
                  <Link
                    to={`/${locale}/contact`}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-brand-700 hover:bg-brand-100 font-semibold whitespace-nowrap transition-colors"
                  >
                    <span>{messages.actions.contactUs}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}

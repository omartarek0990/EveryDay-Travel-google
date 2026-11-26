import React from 'react';
import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { useI18n } from '../../components/I18nProvider';
import { usePublicData } from '../../components/PublicDataContext';
import { PublicLayout } from '../../components/public/PublicLayout';
import { SeoHead } from '../../components/public/SeoHead';
import { WhatsAppIcon } from '../../components/public/WhatsAppIcon';
import { buildWhatsAppUrl, isSafeExternalHttpsUrl } from '../../shared/format';

export function ContactPage() {
  const { messages, t } = useI18n();
  const { data, loading } = usePublicData();

  if (loading || !data) {
    return (
      <PublicLayout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-36 rounded-2xl bg-surface-alt animate-pulse" />
          ))}
        </div>
      </PublicLayout>
    );
  }

  const { settings } = data;
  const intro = t(settings.contactIntro);
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

  return (
    <PublicLayout>
      <SeoHead title={messages.nav.contact} description={intro.text} />

      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">
              {messages.nav.contact}
            </h1>
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

          {!hasAnyContact ? (
            <div className="rounded-2xl border border-border bg-surface-alt p-10 text-center text-muted">
              {messages.contact.noContactDetails}
            </div>
          ) : (
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
                    <h2 className="text-lg font-bold text-ink">{messages.contact.whatsappLabel}</h2>
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
                    <h2 className="text-lg font-bold text-ink">{messages.contact.phoneLabel}</h2>
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
                    <h2 className="text-lg font-bold text-ink">{messages.contact.emailLabel}</h2>
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
                    <h2 className="text-lg font-bold text-ink">{messages.contact.addressLabel}</h2>
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
                <div className="md:col-span-2 rounded-2xl border border-border bg-surface-alt p-6">
                  <h2 className="text-lg font-bold text-ink mb-4">{messages.contact.socialLabel}</h2>
                  <div className="flex flex-wrap gap-3">
                    {socials.map((s) => (
                      <a
                        key={s.label}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border hover:border-brand-600 text-sm font-semibold text-ink transition-colors"
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
        </div>
      </section>
    </PublicLayout>
  );
}

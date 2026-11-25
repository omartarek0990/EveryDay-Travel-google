import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../components/I18nProvider';
import { usePublicData } from '../../components/PublicDataContext';
import { PublicLayout } from '../../components/public/PublicLayout';
import { SeoHead } from '../../components/public/SeoHead';
import { WhatsAppIcon } from '../../components/public/WhatsAppIcon';
import { buildWhatsAppUrl } from '../../shared/format';

export function AboutPage() {
  const { locale, messages, t } = useI18n();
  const { data, loading } = usePublicData();

  if (loading || !data) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-4">
          <div className="h-10 w-48 bg-surface-alt rounded-lg animate-pulse" />
          <div className="h-40 bg-surface-alt rounded-2xl animate-pulse" />
        </div>
      </PublicLayout>
    );
  }

  const { settings } = data;
  const aboutTitle = t(settings.aboutTitle);
  const aboutBody = t(settings.aboutBody);
  const contactIntro = t(settings.contactIntro);
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

  return (
    <PublicLayout>
      <SeoHead title={aboutTitle.text || messages.nav.about} description={aboutBody.text} />

      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-14">
          <div className="max-w-3xl">
            <h1
              lang={aboutTitle.isFallbackAr ? 'ar' : undefined}
              dir={aboutTitle.isFallbackAr ? 'rtl' : undefined}
              className="text-3xl sm:text-4xl font-extrabold text-ink"
            >
              {aboutTitle.text || messages.nav.about}
            </h1>
            {aboutBody.text && (
              <p
                lang={aboutBody.isFallbackAr ? 'ar' : undefined}
                dir={aboutBody.isFallbackAr ? 'rtl' : undefined}
                className="mt-5 text-base sm:text-lg text-ink/90 leading-relaxed whitespace-pre-line"
              >
                {aboutBody.text}
              </p>
            )}
          </div>

          {settings.whyUsItems.length > 0 && (
            <div>
              <h2 className="text-2xl font-extrabold text-ink mb-6">
                {messages.sections.whyEveryDay}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {settings.whyUsItems.slice(0, 4).map((item, idx) => {
                  const title = t(item.title);
                  const body = t(item.body);
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-surface-alt border border-border p-6"
                    >
                      <span className="inline-block text-xs font-bold text-brand-600 tabular-nums mb-2">
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
          )}

          <div className="rounded-2xl bg-brand-600 text-white p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-extrabold mb-2">{messages.sections.readyToTravel}</h2>
              {contactIntro.text && (
                <p
                  lang={contactIntro.isFallbackAr ? 'ar' : undefined}
                  dir={contactIntro.isFallbackAr ? 'rtl' : undefined}
                  className="text-white/90"
                >
                  {contactIntro.text}
                </p>
              )}
            </div>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-brand-700 hover:bg-brand-100 font-semibold whitespace-nowrap shrink-0"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>{messages.actions.whatsappUs}</span>
              </a>
            ) : (
              <Link
                to={`/${locale}/contact`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-brand-700 hover:bg-brand-100 font-semibold whitespace-nowrap shrink-0"
              >
                <span>{messages.actions.contactUs}</span>
              </Link>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

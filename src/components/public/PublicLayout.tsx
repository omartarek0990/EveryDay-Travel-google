import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Mail, MapPin, Phone } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { useI18n } from '../I18nProvider';
import { usePublicData } from '../PublicDataContext';
import { buildWhatsAppUrl, isSafeExternalHttpsUrl } from '../../shared/format';
import { WhatsAppIcon } from './WhatsAppIcon';

export function PublicLayout({
  children,
  transparentHeaderOnTop = false,
  hideFloatingWhatsApp = false,
}: {
  children: React.ReactNode;
  transparentHeaderOnTop?: boolean;
  hideFloatingWhatsApp?: boolean;
}) {
  const { locale, messages, t, switchLocalePath } = useI18n();
  const { data } = usePublicData();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  const settings = data?.settings;
  const companyName = settings ? t(settings.companyName) : { text: 'everyDay', isFallbackAr: false };
  const footerTagline = settings ? t(settings.footerTagline) : { text: '', isFallbackAr: false };
  const address = settings ? t(settings.address) : { text: '', isFallbackAr: false };

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappUrl = settings?.whatsapp
    ? buildWhatsAppUrl(
        settings.whatsapp,
        t(settings.whatsappMessage).text,
        companyName.text,
        pageUrl
      )
    : null;

  const isTransparent = transparentHeaderOnTop && !scrolled;

  const navItems = [
    { to: `/${locale}`, label: messages.nav.home, end: true },
    { to: `/${locale}/trips`, label: messages.nav.trips, end: false },
    { to: `/${locale}/gallery`, label: messages.nav.gallery, end: false },
    { to: `/${locale}/about`, label: messages.nav.about, end: false },
    { to: `/${locale}/contact`, label: messages.nav.contact, end: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink">
      {/* Header: strict 3-zone top bar */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-colors duration-200 ${
          isTransparent
            ? 'bg-gradient-to-b from-black/55 to-transparent'
            : 'bg-brand-600 shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-8">
          {/* Zone 1: Brand mark */}
          <Link to={`/${locale}`} className="shrink-0 flex items-center focus-visible:outline-white">
            <BrandLogo logoImage={settings?.logoImage} size="md" />
          </Link>

          {/* Zone 2: Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `text-sm font-medium whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                    isActive
                      ? 'text-white border-white'
                      : 'text-white/90 border-transparent hover:text-white hover:border-white/50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: Language Switcher + 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center bg-black/20 rounded-lg p-0.5 text-xs font-semibold">
              <Link
                to={switchLocalePath('ar')}
                className={`px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                  locale === 'ar'
                    ? 'bg-white text-brand-700'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                AR
              </Link>
              <Link
                to={switchLocalePath('en')}
                className={`px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                  locale === 'en'
                    ? 'bg-white text-brand-700'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                EN
              </Link>
            </div>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 bg-white text-brand-700 hover:bg-brand-100 transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>{messages.actions.contactUs}</span>
              </a>
            ) : (
              <Link
                to={`/${locale}/contact`}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 bg-white text-brand-700 hover:bg-brand-100 transition-colors"
              >
                <span>{messages.actions.contactUs}</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={messages.actions.menu}
              className="lg:hidden p-2 rounded-xl text-white hover:bg-white/15 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 end-0 w-72 max-w-[85vw] bg-brand-600 text-white p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/15">
                <BrandLogo logoImage={settings?.logoImage} size="sm" />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={messages.actions.close}
                  className="p-2 rounded-lg text-white hover:bg-white/15 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-6 flex flex-col gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                        isActive ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="pt-6 border-t border-white/15">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-brand-700 font-semibold"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>{messages.actions.whatsappUs}</span>
                </a>
              ) : (
                <Link
                  to={`/${locale}/contact`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-brand-700 font-semibold"
                >
                  <span>{messages.actions.contactUs}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${transparentHeaderOnTop ? '' : 'pt-16 sm:pt-[72px]'}`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-ink text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <BrandLogo logoImage={settings?.logoImage} size="md" />
              {footerTagline.text && (
                <p
                  lang={footerTagline.isFallbackAr ? 'ar' : undefined}
                  dir={footerTagline.isFallbackAr ? 'rtl' : undefined}
                  className="text-sm text-white/75 leading-relaxed max-w-xs"
                >
                  {footerTagline.text}
                </p>
              )}
              <div className="flex items-center gap-3 pt-1">
                {settings?.facebookUrl && isSafeExternalHttpsUrl(settings.facebookUrl) && (
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-brand-600 flex items-center justify-center transition-colors text-xs font-bold"
                  >
                    FB
                  </a>
                )}
                {settings?.instagramUrl && isSafeExternalHttpsUrl(settings.instagramUrl) && (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-brand-600 flex items-center justify-center transition-colors text-xs font-bold"
                  >
                    IG
                  </a>
                )}
                {settings?.tiktokUrl && isSafeExternalHttpsUrl(settings.tiktokUrl) && (
                  <a
                    href={settings.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-brand-600 flex items-center justify-center transition-colors text-xs font-bold"
                  >
                    TT
                  </a>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-white mb-4">{messages.footer.quickLinks}</h2>
              <ul className="space-y-2.5 text-sm text-white/75">
                {navItems.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-bold text-white mb-4">{messages.footer.contactInfo}</h2>
              <div className="space-y-3 text-sm text-white/75">
                {settings?.phone && (
                  <a
                    href={`tel:${settings.phone}`}
                    className="flex items-center gap-2.5 hover:text-white transition-colors tabular-nums"
                    dir="ltr"
                  >
                    <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>{settings.phone}</span>
                  </a>
                )}
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 hover:text-white transition-colors"
                  >
                    <WhatsAppIcon className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>{messages.actions.whatsappUs}</span>
                  </a>
                )}
                {settings?.email && (
                  <a
                    href={`mailto:${settings.email}`}
                    className="flex items-center gap-2.5 hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>{settings.email}</span>
                  </a>
                )}
                {address.text && (
                  <p
                    lang={address.isFallbackAr ? 'ar' : undefined}
                    dir={address.isFallbackAr ? 'rtl' : undefined}
                    className="flex items-start gap-2.5"
                  >
                    <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                    <span>{address.text}</span>
                  </p>
                )}
                {!settings?.phone && !whatsappUrl && !settings?.email && !address.text && (
                  <Link
                    to={`/${locale}/contact`}
                    className="inline-block text-white/75 hover:text-white underline underline-offset-4"
                  >
                    {messages.actions.contactUs}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
            <p
              lang={companyName.isFallbackAr ? 'ar' : undefined}
              dir={companyName.isFallbackAr ? 'rtl' : undefined}
            >
              © {new Date().getFullYear()} {companyName.text}. {messages.footer.rights}.
            </p>
            <Link to="/admin" className="text-white/45 hover:text-white/80 transition-colors">
              {locale === 'ar' ? 'لوحة المالك' : 'Owner Portal'}
            </Link>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      {!hideFloatingWhatsApp && whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={messages.actions.whatsappUs}
          className="fixed bottom-5 end-5 z-30 w-13 h-13 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg flex items-center justify-center transition-transform duration-150 hover:scale-105"
        >
          <WhatsAppIcon className="w-6 h-6" />
        </a>
      )}
    </div>
  );
}

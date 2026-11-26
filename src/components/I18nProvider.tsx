import React, { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import arMessages from '../messages/ar.json';
import enMessages from '../messages/en.json';
import { resolveLocalizedText } from '../shared/format';
import type { Locale, LocalizedText } from '../shared/types';

type Messages = typeof arMessages;

interface I18nContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  messages: Messages;
  t: (field: LocalizedText | null | undefined) => { text: string; isFallbackAr: boolean };
  switchLocalePath: (target: Locale) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const messages = locale === 'ar' ? arMessages : enMessages;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  // Update hreflang & canonical link tags dynamically for current route
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    const origin = window.location.origin;
    const subPath = location.pathname.replace(/^\/(ar|en)/, '') || '';
    const search = location.search || '';

    const ensureLink = (rel: string, hreflang: string | null, href: string) => {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]:not([hreflang])`;
      let el = document.head.querySelector<HTMLLinkElement>(selector);
      if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        if (hreflang) el.hreflang = hreflang;
        document.head.appendChild(el);
      }
      el.href = href;
    };

    ensureLink('canonical', null, `${origin}/${locale}${subPath}${search}`);
    ensureLink('alternate', 'ar', `${origin}/ar${subPath}${search}`);
    ensureLink('alternate', 'en', `${origin}/en${subPath}${search}`);
    ensureLink('alternate', 'x-default', `${origin}/ar${subPath}${search}`);
  }, [locale, location.pathname, location.search]);

  const switchLocalePath = (target: Locale) => {
    const rest = location.pathname.replace(/^\/(ar|en)/, '') || '';
    return `/${target}${rest}${location.search}${location.hash || ''}`;
  };

  const t = (field: LocalizedText | null | undefined) => resolveLocalizedText(field, locale);

  return (
    <I18nContext.Provider value={{ locale, dir, messages, t, switchLocalePath }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

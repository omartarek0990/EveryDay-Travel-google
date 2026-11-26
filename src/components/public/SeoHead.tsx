import { useEffect } from 'react';
import { useI18n } from '../I18nProvider';
import { usePublicData } from '../PublicDataContext';

export function SeoHead({
  title,
  description,
  imageUrl,
  jsonLd,
}: {
  title?: string;
  description?: string;
  imageUrl?: string | null;
  jsonLd?: Record<string, unknown> | null;
}) {
  const { locale, t } = useI18n();
  const { data } = usePublicData();

  useEffect(() => {
    const defaultTitle = data ? t(data.settings.seoTitle).text : 'everyDay';
    const defaultDesc = data ? t(data.settings.seoDescription).text : '';
    const finalTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;
    const finalDesc = description || defaultDesc;
    const finalImg = imageUrl || data?.settings.ogImage?.url || '';

    document.title = finalTitle;

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = value;
    };

    setMeta('meta[name="description"]', 'name', 'description', finalDesc);
    setMeta('meta[property="og:title"]', 'property', 'og:title', finalTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', finalDesc);
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', locale === 'ar' ? 'ar_EG' : 'en_US');
    if (finalImg) {
      const absImg = finalImg.startsWith('http') ? finalImg : `${window.location.origin}${finalImg}`;
      setMeta('meta[property="og:image"]', 'property', 'og:image', absImg);
    }
  }, [title, description, imageUrl, data, locale, t]);

  useEffect(() => {
    const existing = document.getElementById('everyday-jsonld');
    if (existing) existing.remove();
    if (!jsonLd) return;

    const script = document.createElement('script');
    script.id = 'everyday-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [jsonLd]);

  return null;
}

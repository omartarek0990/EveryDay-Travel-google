import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../components/I18nProvider';
import { PublicLayout } from '../../components/public/PublicLayout';
import { SeoHead } from '../../components/public/SeoHead';
import { useHideAppLoader } from '../../lib/appLoader';

export function NotFoundPage() {
  const { locale, messages } = useI18n();
  // This page needs no data, so it is ready as soon as it renders.
  useHideAppLoader();

  return (
    <PublicLayout>
      <SeoHead title={messages.notFound.title} />
      <section className="py-20 sm:py-28">
        <div className="max-w-lg mx-auto px-4 text-center space-y-5">
          <span className="inline-block text-5xl font-extrabold text-brand-600 tabular-nums">
            404
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
            {messages.notFound.title}
          </h1>
          <p className="text-muted">{messages.notFound.description}</p>
          <div className="pt-2">
            <Link
              to={`/${locale}`}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors"
            >
              {messages.actions.backHome}
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

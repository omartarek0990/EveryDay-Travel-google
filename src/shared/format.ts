import type { Locale, LocalizedText, PricePrefix, PriceUnit } from './types';

export function formatWesternNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
    numberingSystem: 'latn',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyEGP(amount: number, locale: Locale): string {
  const formatted = formatWesternNumber(amount, locale);
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

export function formatTripPrice(
  opts: {
    priceAmount: number | null;
    pricePrefix: PricePrefix;
    priceUnit: PriceUnit;
  },
  locale: Locale,
  labels: {
    startingFrom: string;
    perPerson: string;
    perTrip: string;
    contactForPrice: string;
  }
): string {
  if (opts.priceAmount === null || opts.priceAmount === undefined) {
    return labels.contactForPrice;
  }
  const amount = formatCurrencyEGP(opts.priceAmount, locale);
  const prefix = opts.pricePrefix === 'STARTING_FROM' ? `${labels.startingFrom} ` : '';
  const unit =
    opts.priceUnit === 'PER_PERSON'
      ? ` / ${labels.perPerson}`
      : opts.priceUnit === 'PER_TRIP'
        ? ` / ${labels.perTrip}`
        : '';
  return `${prefix}${amount}${unit}`.trim();
}

export function formatDaysCount(count: number, locale: Locale): string {
  const num = formatWesternNumber(count, locale);
  if (locale === 'en') {
    return count === 1 ? `${num} day` : `${num} days`;
  }
  // Arabic ICU plural rules: one (1), two (2), few (3..10), other (11+)
  if (count === 1) return 'يوم';
  if (count === 2) return 'يومان';
  const mod100 = count % 100;
  if (mod100 >= 3 && mod100 <= 10) {
    return `${num} أيام`;
  }
  return `${num} يوماً`;
}

export function buildWhatsAppUrl(
  whatsappDigits: string,
  template: string,
  tripTitle: string,
  pageUrl: string
): string | null {
  const cleanDigits = whatsappDigits.replace(/\D/g, '');
  if (!cleanDigits) return null;
  const message = template
    .replaceAll('{trip}', tripTitle)
    .replaceAll('{url}', pageUrl)
    .replace(/\s+/g, ' ')
    .trim();
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanDigits}?text=${encoded}`;
}

export function resolveLocalizedText(
  field: LocalizedText | null | undefined,
  locale: Locale
): { text: string; isFallbackAr: boolean } {
  if (!field) return { text: '', isFallbackAr: false };
  if (locale === 'ar') {
    return { text: field.ar || field.en || '', isFallbackAr: false };
  }
  if (field.en && field.en.trim().length > 0) {
    return { text: field.en, isFallbackAr: false };
  }
  return { text: field.ar || '', isFallbackAr: Boolean(field.ar) };
}

export function slugifyAscii(input: string, fallbackPrefix = 'trip'): string {
  const cleaned = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  if (cleaned) return cleaned;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${fallbackPrefix}-${rand}`;
}

export function isSafeExternalHttpsUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

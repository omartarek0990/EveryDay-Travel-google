import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppUrl,
  formatCurrencyEGP,
  formatDaysCount,
  formatTripPrice,
  resolveLocalizedText,
  slugifyAscii,
} from './format';
import { normalizeEgyptianWhatsapp, validatePasswordStrength } from './schemas';

describe('formatting and validation helpers', () => {
  it('formats EGP currency with Western digits in Arabic and English', () => {
    expect(formatCurrencyEGP(1200, 'ar')).toBe('1,200 ج.م');
    expect(formatCurrencyEGP(1200, 'en')).toBe('EGP 1,200');
  });

  it('formats trip prices with prefix, unit, or fallback', () => {
    expect(
      formatTripPrice(
        { priceAmount: 4800, pricePrefix: 'STARTING_FROM', priceUnit: 'PER_PERSON' },
        'en',
        {
          startingFrom: 'Starting from',
          perPerson: 'per person',
          perTrip: 'per trip',
          contactForPrice: 'Contact us for the price',
        }
      )
    ).toBe('Starting from EGP 4,800 / per person');

    expect(
      formatTripPrice(
        { priceAmount: null, pricePrefix: 'NONE', priceUnit: 'NONE' },
        'ar',
        {
          startingFrom: 'ابتداءً من',
          perPerson: 'للفرد',
          perTrip: 'للرحلة',
          contactForPrice: 'تواصل لمعرفة السعر',
        }
      )
    ).toBe('تواصل لمعرفة السعر');
  });

  it('formats day counts with Arabic ICU plurals and Western digits', () => {
    expect(formatDaysCount(1, 'ar')).toBe('يوم');
    expect(formatDaysCount(2, 'ar')).toBe('يومان');
    expect(formatDaysCount(4, 'ar')).toBe('4 أيام');
    expect(formatDaysCount(12, 'ar')).toBe('12 يوماً');
    expect(formatDaysCount(1, 'en')).toBe('1 day');
    expect(formatDaysCount(3, 'en')).toBe('3 days');
  });

  it('normalizes Egyptian WhatsApp numbers and builds wa.me URLs', () => {
    expect(normalizeEgyptianWhatsapp('01012345678')).toBe('201012345678');
    expect(normalizeEgyptianWhatsapp('201112345678')).toBe('201112345678');
    expect(normalizeEgyptianWhatsapp('12345')).toBe('');

    const url = buildWhatsAppUrl(
      '201012345678',
      'Hello, asking about: {trip} {url}',
      'Dahab Escape',
      'https://example.com/en/trips/dahab'
    );
    expect(url).toBe(
      'https://wa.me/201012345678?text=Hello%2C%20asking%20about%3A%20Dahab%20Escape%20https%3A%2F%2Fexample.com%2Fen%2Ftrips%2Fdahab'
    );
  });

  it('falls back to Arabic when English text is empty', () => {
    expect(resolveLocalizedText({ ar: 'رحلة دهب', en: '', enManual: false }, 'en')).toEqual({
      text: 'رحلة دهب',
      isFallbackAr: true,
    });
  });

  it('enforces password strength rules', () => {
    expect(validatePasswordStrength('short', 'omar')).not.toBeNull();
    expect(validatePasswordStrength('omar12345678', 'omar')).not.toBeNull();
    expect(validatePasswordStrength('password123', 'omar')).not.toBeNull();
    expect(validatePasswordStrength('TravelEgypt#2026', 'omar')).toBeNull();
  });

  it('generates clean ASCII slugs with fallback', () => {
    expect(slugifyAscii('Dahab: Red Sea & Lagoon')).toBe('dahab-red-sea-lagoon');
    expect(slugifyAscii('رحلة دهب')).toMatch(/^trip-[a-z0-9]+$/);
  });
});

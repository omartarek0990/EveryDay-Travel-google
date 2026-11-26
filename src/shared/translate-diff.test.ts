import { describe, expect, it } from 'vitest';
import { prepareTranslationTasks } from './translate-diff';

describe('prepareTranslationTasks', () => {
  it('queues translation when Arabic text is new and English is empty', () => {
    const diff = prepareTranslationTasks([
      {
        path: 'title',
        next: { ar: 'رحلة دهب', en: '', enManual: false },
        prev: null,
      },
    ]);

    expect(diff.tasks).toEqual([{ path: 'title', ar: 'رحلة دهب' }]);
    const applied = diff.apply(new Map([['title', 'Dahab Trip']]), new Set());
    expect(applied.get('title')).toEqual({
      ar: 'رحلة دهب',
      en: 'Dahab Trip',
      enManual: false,
    });
  });

  it('skips translation when Arabic text is unchanged and English already exists', () => {
    const diff = prepareTranslationTasks([
      {
        path: 'title',
        next: { ar: 'رحلة دهب', en: 'Dahab Trip', enManual: false },
        prev: { ar: 'رحلة دهب', en: 'Dahab Trip', enManual: false },
      },
    ]);

    expect(diff.tasks).toHaveLength(0);
    const applied = diff.apply(new Map(), new Set());
    expect(applied.get('title')?.en).toBe('Dahab Trip');
  });

  it('never overwrites enManual=true even when Arabic text changes', () => {
    const diff = prepareTranslationTasks([
      {
        path: 'title',
        next: { ar: 'رحلة دهب الجديدة', en: 'Custom Dahab Escape', enManual: true },
        prev: { ar: 'رحلة دهب', en: 'Custom Dahab Escape', enManual: true },
      },
    ]);

    expect(diff.tasks).toHaveLength(0);
    const applied = diff.apply(new Map(), new Set());
    expect(applied.get('title')).toEqual({
      ar: 'رحلة دهب الجديدة',
      en: 'Custom Dahab Escape',
      enManual: true,
    });
  });

  it('translates again when force=true even if enManual was true', () => {
    const diff = prepareTranslationTasks([
      {
        path: 'title',
        next: { ar: 'رحلة سيوة', en: 'Old Manual', enManual: true },
        prev: { ar: 'رحلة سيوة', en: 'Old Manual', enManual: true },
        force: true,
      },
    ]);

    expect(diff.tasks).toEqual([{ path: 'title', ar: 'رحلة سيوة' }]);
    const applied = diff.apply(new Map([['title', 'Siwa Trip']]), new Set());
    expect(applied.get('title')).toEqual({
      ar: 'رحلة سيوة',
      en: 'Siwa Trip',
      enManual: false,
    });
  });

  it('leaves en empty when translation fails for a field', () => {
    const diff = prepareTranslationTasks([
      {
        path: 'tagline',
        next: { ar: 'استكشف البحر الأحمر', en: 'Old En', enManual: false },
        prev: { ar: 'قديم', en: 'Old En', enManual: false },
      },
    ]);

    const applied = diff.apply(new Map(), new Set(['tagline']));
    expect(applied.get('tagline')).toEqual({
      ar: 'استكشف البحر الأحمر',
      en: '',
      enManual: false,
    });
  });

  it('clears English text when Arabic text is cleared', () => {
    const diff = prepareTranslationTasks([
      {
        path: 'badge',
        next: { ar: '', en: 'Offer', enManual: false },
        prev: { ar: 'عرض', en: 'Offer', enManual: false },
      },
    ]);

    expect(diff.tasks).toHaveLength(0);
    const applied = diff.apply(new Map(), new Set());
    expect(applied.get('badge')).toEqual({
      ar: '',
      en: '',
      enManual: false,
    });
  });
});

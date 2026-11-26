import type { LocalizedText } from './types';

export interface TranslationTask {
  path: string;
  ar: string;
}

export interface TranslationDiffResult {
  tasks: TranslationTask[];
  /**
   * Returns a normalized LocalizedText object with translated strings applied
   * (or leaves `en` empty when translation failed for that path).
   */
  apply: (
    translatedMap: Map<string, string>,
    failedPaths: Set<string>
  ) => Map<string, LocalizedText>;
}

/**
 * Computes which LocalizedText fields require automatic Arabic -> English translation:
 * - Only translates when `ar` is non-empty AND:
 *   - `enManual` is false AND (`ar` changed from `prev.ar` OR `en` is empty)
 *   - OR `force` is true (owner clicked "Re-translate from Arabic")
 * - Never overwrites fields where `enManual === true` unless `force` explicitly cleared `enManual`.
 */
export function prepareTranslationTasks(
  entries: Array<{
    path: string;
    next: LocalizedText;
    prev?: LocalizedText | null;
    force?: boolean;
  }>
): TranslationDiffResult {
  const tasks: TranslationTask[] = [];
  const prepared = new Map<string, LocalizedText>();

  for (const entry of entries) {
    const ar = entry.next.ar.trim();
    const en = entry.next.en.trim();
    const enManual = entry.force ? false : Boolean(entry.next.enManual);

    if (!ar) {
      prepared.set(entry.path, { ar: '', en: enManual ? en : '', enManual });
      continue;
    }

    const prevAr = entry.prev?.ar?.trim() ?? '';
    const arChanged = ar !== prevAr;
    const needsTranslation = entry.force || (!enManual && (arChanged || en.length === 0));

    if (needsTranslation) {
      tasks.push({ path: entry.path, ar });
      prepared.set(entry.path, { ar, en, enManual: false });
    } else {
      prepared.set(entry.path, { ar, en, enManual });
    }
  }

  return {
    tasks,
    apply: (translatedMap, failedPaths) => {
      const out = new Map<string, LocalizedText>();
      for (const [path, base] of prepared.entries()) {
        if (translatedMap.has(path)) {
          out.set(path, {
            ar: base.ar,
            en: translatedMap.get(path)!.trim(),
            enManual: false,
          });
        } else if (failedPaths.has(path)) {
          out.set(path, {
            ar: base.ar,
            en: '',
            enManual: false,
          });
        } else {
          out.set(path, base);
        }
      }
      return out;
    },
  };
}

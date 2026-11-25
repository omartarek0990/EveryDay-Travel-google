import { GoogleGenAI, Type } from '@google/genai';
import type { LocalizedText } from '../src/shared/types.ts';
import { prepareTranslationTasks } from '../src/shared/translate-diff.ts';

export interface TranslationProvider {
  readonly name: string;
  translate(texts: string[], opts: { source: 'ar'; target: 'en' }): Promise<string[]>;
}

class GoogleTranslateV2Provider implements TranslationProvider {
  readonly name = 'google-v2';

  constructor(private readonly apiKey: string) {}

  private async callApi(texts: string[]): Promise<string[]> {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: texts,
          source: 'ar',
          target: 'en',
          format: 'text',
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Google Translate API HTTP ${res.status}: ${errText.slice(0, 120)}`);
    }

    const data = (await res.json()) as {
      data?: { translations?: Array<{ translatedText: string }> };
    };
    const items = data.data?.translations;
    if (!items || items.length !== texts.length) {
      throw new Error('Google Translate returned mismatched translation count');
    }
    return items.map((t) => t.translatedText);
  }

  async translate(texts: string[]): Promise<string[]> {
    if (texts.length === 0) return [];
    const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
    try {
      const result = await this.callApi(texts);
      console.info(`[Translation:${this.name}] Translated ${totalChars} chars (${texts.length} fields)`);
      return result;
    } catch (firstErr) {
      console.warn(`[Translation:${this.name}] First attempt failed, retrying once:`, firstErr);
      const retryResult = await this.callApi(texts);
      console.info(`[Translation:${this.name}] Retry succeeded (${totalChars} chars)`);
      return retryResult;
    }
  }
}

class GeminiTranslateProvider implements TranslationProvider {
  readonly name = 'gemini';

  constructor(private readonly apiKey: string) {}

  private async callApi(texts: string[]): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const prompt = [
      'Translate the following Egyptian/Modern Standard Arabic travel website texts into natural, concise, welcoming English.',
      'Return ONLY a JSON object matching the schema with a "translations" array of the exact same length and order.',
      'Preserve placeholders like {trip} and {url} untouched.',
      `Inputs JSON: ${JSON.stringify(texts)}`,
    ].join('\n');

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['translations'],
          },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini translation timeout')), 8000)
      ),
    ]);

    const parsed = JSON.parse(response.text || '{}') as { translations?: string[] };
    if (!Array.isArray(parsed.translations) || parsed.translations.length !== texts.length) {
      throw new Error('Gemini returned mismatched translation array');
    }
    return parsed.translations;
  }

  async translate(texts: string[]): Promise<string[]> {
    if (texts.length === 0) return [];
    const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
    try {
      const result = await this.callApi(texts);
      console.info(`[Translation:${this.name}] Translated ${totalChars} chars (${texts.length} fields)`);
      return result;
    } catch (firstErr) {
      console.warn(`[Translation:${this.name}] First attempt failed, retrying once:`, firstErr);
      const retryResult = await this.callApi(texts);
      console.info(`[Translation:${this.name}] Retry succeeded (${totalChars} chars)`);
      return retryResult;
    }
  }
}

export function getTranslationProvider(): TranslationProvider | null {
  const configured = (process.env.TRANSLATION_PROVIDER || '').toLowerCase().trim();
  const googleKey = (process.env.GOOGLE_TRANSLATE_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();

  if (configured === 'none') return null;

  if (configured === 'google') {
    return googleKey ? new GoogleTranslateV2Provider(googleKey) : null;
  }
  if (configured === 'gemini') {
    return geminiKey ? new GeminiTranslateProvider(geminiKey) : null;
  }

  // Default behavior: Google Cloud Translation Basic v2 when configured, else Gemini if present in runtime
  if (googleKey) return new GoogleTranslateV2Provider(googleKey);
  if (geminiKey) return new GeminiTranslateProvider(geminiKey);
  return null;
}

export async function translateEntriesBatch(
  entries: Array<{
    path: string;
    next: LocalizedText;
    prev?: LocalizedText | null;
    force?: boolean;
  }>
): Promise<{
  resolved: Map<string, LocalizedText>;
  failedPaths: string[];
  translatedChars: number;
}> {
  const diff = prepareTranslationTasks(entries);
  if (diff.tasks.length === 0) {
    return {
      resolved: diff.apply(new Map(), new Set()),
      failedPaths: [],
      translatedChars: 0,
    };
  }

  const provider = getTranslationProvider();
  if (!provider) {
    const failed = new Set(diff.tasks.map((t) => t.path));
    return {
      resolved: diff.apply(new Map(), failed),
      failedPaths: Array.from(failed),
      translatedChars: 0,
    };
  }

  const texts = diff.tasks.map((t) => t.ar);
  const translatedChars = texts.reduce((sum, t) => sum + t.length, 0);

  try {
    const results = await provider.translate(texts, { source: 'ar', target: 'en' });
    const translatedMap = new Map<string, string>();
    diff.tasks.forEach((task, i) => {
      translatedMap.set(task.path, results[i] ?? '');
    });
    return {
      resolved: diff.apply(translatedMap, new Set()),
      failedPaths: [],
      translatedChars,
    };
  } catch (err) {
    console.error('[Translation] Batch translation failed; saving Arabic with empty English:', err);
    const failed = new Set(diff.tasks.map((t) => t.path));
    return {
      resolved: diff.apply(new Map(), failed),
      failedPaths: Array.from(failed),
      translatedChars: 0,
    };
  }
}

import { describe, expect, it } from 'vitest';
import { apiErrorMessage, apiErrorStatus } from './app.ts';

describe('API error mapping', () => {
  it('keeps the status Express middleware puts on the error', () => {
    expect(apiErrorStatus({ status: 413, type: 'entity.too.large' })).toBe(413);
    expect(apiErrorStatus({ statusCode: 400 })).toBe(400);
    expect(apiErrorStatus(Object.assign(new Error('too big'), { status: 413 }))).toBe(413);
  });

  it('falls back to 500 for unknown or invalid statuses', () => {
    expect(apiErrorStatus(new Error('boom'))).toBe(500);
    expect(apiErrorStatus(null)).toBe(500);
    expect(apiErrorStatus({ status: 302 })).toBe(500);
    expect(apiErrorStatus({ status: 999 })).toBe(500);
    expect(apiErrorStatus({ status: 'not-a-number' })).toBe(500);
  });

  it('returns Arabic messages and never internal detail', () => {
    expect(apiErrorMessage(413)).toContain('أكبر من المسموح');
    expect(apiErrorMessage(400)).toBe('بيانات غير صالحة.');
    for (const status of [400, 401, 403, 404, 413, 429, 500]) {
      const message = apiErrorMessage(status);
      expect(/[\u0600-\u06FF]/.test(message)).toBe(true);
      expect(message).not.toMatch(/error|Error|null|undefined|supabase|relation|column/i);
    }
  });
});

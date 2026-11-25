import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, RefreshCw } from 'lucide-react';
import type { LocalizedText } from '../../shared/types';

export function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  required = false,
  placeholder = '',
  helperText,
  translating = false,
  failed = false,
  onRetryTranslate,
}: {
  label: string;
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  translating?: boolean;
  failed?: boolean;
  onRetryTranslate?: () => void;
}) {
  const [enExpanded, setEnExpanded] = useState(Boolean(failed || value.enManual));

  const status = translating
    ? { label: 'جاري الترجمة...', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
    : failed
      ? { label: 'فشلت الترجمة', cls: 'bg-red-50 text-red-700 border-red-200' }
      : value.enManual
        ? { label: 'يدوي', cls: 'bg-sky-50 text-sky-800 border-sky-200' }
        : value.en
          ? { label: 'تمت الترجمة', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
          : { label: 'بانتظار الترجمة', cls: 'bg-surface-alt text-muted border-border' };

  const inputClass =
    'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand-600 focus:outline-none';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-ink">
          {label}
          {required && <span className="text-red-600 ms-1">*</span>}
        </label>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${status.cls}`}>
            {status.label}
          </span>
          <button
            type="button"
            onClick={() => setEnExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
          >
            <span>الإنجليزي</span>
            {enExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {multiline ? (
        <textarea
          rows={rows}
          dir="rtl"
          value={value.ar}
          placeholder={placeholder}
          onChange={(e) => onChange({ ...value, ar: e.target.value })}
          className={inputClass}
        />
      ) : (
        <input
          type="text"
          dir="rtl"
          value={value.ar}
          placeholder={placeholder}
          onChange={(e) => onChange({ ...value, ar: e.target.value })}
          className={inputClass}
        />
      )}

      {helperText && <p className="text-xs text-muted">{helperText}</p>}

      {enExpanded && (
        <div className="rounded-xl border border-border bg-surface-alt p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted">
              النسخة الإنجليزية {value.enManual ? '(تعديل يدوي)' : '(مترجمة تلقائياً)'}
            </span>
            <div className="flex items-center gap-2">
              {!value.enManual && (
                <button
                  type="button"
                  onClick={() => onChange({ ...value, enManual: true })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>تعديل الإنجليزية</span>
                </button>
              )}
              {(value.enManual || failed) && (
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...value, enManual: false });
                    onRetryTranslate?.();
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-brand-600"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{failed ? 'إعادة المحاولة' : 'إعادة الترجمة من العربية'}</span>
                </button>
              )}
            </div>
          </div>

          {multiline ? (
            <textarea
              rows={rows}
              dir="ltr"
              readOnly={!value.enManual}
              value={value.en}
              placeholder="Will be generated automatically on save..."
              onChange={(e) => onChange({ ...value, en: e.target.value, enManual: true })}
              className={`w-full rounded-lg border border-border px-3 py-2 text-sm text-ink ${
                value.enManual ? 'bg-surface' : 'bg-surface/60 text-muted cursor-default'
              }`}
            />
          ) : (
            <input
              type="text"
              dir="ltr"
              readOnly={!value.enManual}
              value={value.en}
              placeholder="Will be generated automatically on save..."
              onChange={(e) => onChange({ ...value, en: e.target.value, enManual: true })}
              className={`w-full rounded-lg border border-border px-3 py-2 text-sm text-ink ${
                value.enManual ? 'bg-surface' : 'bg-surface/60 text-muted cursor-default'
              }`}
            />
          )}
        </div>
      )}
    </div>
  );
}

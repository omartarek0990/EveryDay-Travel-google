import React, { useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';

export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}

export function StickySaveBar({
  isDirty,
  saving,
  onSave,
  onReset,
  saveLabel = 'حفظ التغييرات',
}: {
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset?: () => void;
  saveLabel?: string;
}) {
  useUnsavedChangesWarning(isDirty);

  if (!isDirty && !saving) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 lg:start-72 lg:end-8 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-3xl rounded-2xl bg-ink text-white px-5 py-3.5 shadow-xl flex items-center justify-between gap-4">
        <span className="text-sm font-medium">لديك تغييرات غير محفوظة</span>
        <div className="flex items-center gap-2.5 shrink-0">
          {onReset && !saving && (
            <button
              type="button"
              onClick={onReset}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              تراجع
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الترجمة والحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saveLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

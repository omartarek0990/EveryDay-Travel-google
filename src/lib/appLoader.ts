import { useEffect } from 'react';
declare global { interface Window { __hideAppLoader?: () => void } }
export function hideAppLoader(): void { window.__hideAppLoader?.(); }
export function useHideAppLoader(enabled: boolean = true): void {
  useEffect(() => { if (enabled) hideAppLoader(); }, [enabled]);
}

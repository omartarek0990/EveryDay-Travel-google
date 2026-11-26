import React from 'react';

/** Mirrors the trip detail layout (breadcrumb + 4:3 gallery + summary card). */
export function TripDetailSkeleton() {
  return (
    <div className="py-8 sm:py-12 pb-24 sm:pb-16" aria-busy="true" aria-live="polite">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-5 w-56 max-w-full rounded bg-surface-alt mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-7 space-y-3">
            <div className="w-full aspect-[4/3] rounded-2xl bg-surface-alt" />
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {[0, 1, 2, 3, 4].map((n) => (
                <div key={n} className="aspect-[4/3] rounded-xl bg-surface-alt" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-4">
              <div className="h-4 w-40 rounded bg-surface-alt" />
              <div className="h-8 w-3/4 rounded bg-surface-alt" />
              <div className="h-4 w-full rounded bg-surface-alt" />
              <div className="h-4 w-5/6 rounded bg-surface-alt" />
              <div className="h-24 w-full rounded-xl bg-surface-alt" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Minimal shell shown while the admin chunk loads. */
export function AdminShellSkeleton() {
  return (
    <div className="min-h-screen bg-surface-alt flex items-center justify-center" aria-busy="true">
      <div className="w-full max-w-md mx-auto px-6 space-y-4">
        <div className="h-10 w-2/3 mx-auto rounded bg-border/60" />
        <div className="h-12 w-full rounded-xl bg-border/50" />
        <div className="h-12 w-full rounded-xl bg-border/50" />
      </div>
    </div>
  );
}

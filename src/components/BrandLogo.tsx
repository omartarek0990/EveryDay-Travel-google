import React from 'react';
import type { ImageRecord } from '../shared/types';

export function BrandLogo({
  logoImage,
  size = 'md',
}: {
  logoImage?: ImageRecord | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (logoImage?.url) {
    const heightClass = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-11' : 'h-9';
    return (
      <img
        src={logoImage.url}
        alt="everyDay Travel Agency"
        className={`${heightClass} w-auto object-contain select-none`}
        referrerPolicy="no-referrer"
      />
    );
  }

  const textSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-2xl' : 'text-[22px]';
  const pinSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <span
      dir="ltr"
      className="inline-flex items-center gap-1.5 text-white select-none whitespace-nowrap shrink-0"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={`${pinSize} text-white/95 shrink-0`}
      >
        <path
          d="M12 2.5C7.86 2.5 4.5 5.86 4.5 10c0 5.25 6.4 10.6 7.12 11.18a.6.6 0 0 0 .76 0C13.1 20.6 19.5 15.25 19.5 10c0-4.14-3.36-7.5-7.5-7.5Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="12" cy="10" r="2.6" fill="currentColor" />
      </svg>
      <span className={`inline-flex items-baseline leading-none tracking-tight ${textSize}`}>
        <span className="font-[var(--font-script)] italic font-semibold">every</span>
        <span className="font-[var(--font-english)] font-extrabold">Day</span>
      </span>
    </span>
  );
}

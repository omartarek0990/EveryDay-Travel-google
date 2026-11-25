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
    const heightClass = size === 'sm' ? 'h-9' : size === 'lg' ? 'h-14' : 'h-12';
    return (
      <img
        src={logoImage.url}
        alt="everyDay Travel Agency"
        className={`${heightClass} w-auto object-contain select-none`}
        referrerPolicy="no-referrer"
      />
    );
  }

  const scaleClass =
    size === 'sm'
      ? 'scale-[0.82] origin-center'
      : size === 'lg'
        ? 'scale-110 origin-center'
        : '';

  return (
    <span
      dir="ltr"
      className={`relative inline-flex flex-col items-center text-white select-none whitespace-nowrap shrink-0 pt-3.5 pb-1 ${scaleClass}`}
    >
      {/* Spiral map-pin centered slightly right over the y-D junction */}
      <svg
        viewBox="0 0 36 42"
        fill="none"
        aria-hidden="true"
        className="w-5 h-6 text-white absolute top-0 left-[54%] -translate-x-1/2"
      >
        <path
          d="M18 3C10.5 3 4.5 9 4.5 16.5C4.5 26 15.2 36.8 17.3 38.8C17.7 39.2 18.3 39.2 18.7 38.8C20.8 36.8 31.5 26 31.5 16.5C31.5 9 25.5 3 18 3Z"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <path
          d="M18 17.2C18.9 17.2 19.6 16.4 19.5 15.5C19.3 14.2 18 13.5 16.8 13.8C15 14.2 14.2 16 14.6 17.8C15.2 20.1 17.8 21.2 20.1 20.5C22.9 19.6 24.2 16.4 23.1 13.6C21.8 10.3 17.8 8.9 14.4 10.3C11.1 11.7 9.6 15.4 10.5 18.8"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </svg>

      {/* Wordmark */}
      <span className="inline-flex items-baseline leading-none">
        <span className="font-[var(--font-script)] italic font-semibold text-[26px] tracking-tight">
          every
        </span>
        <span className="relative inline-flex flex-col items-start">
          <span className="font-[var(--font-english)] font-normal text-[25px] tracking-tight leading-none">
            Day
          </span>
          <span className="font-[var(--font-english)] font-medium text-[6.5px] tracking-[0.14em] uppercase text-white/95 leading-none mt-0.5 ps-[1px]">
            TRAVEL AGENCY
          </span>
        </span>
      </span>
    </span>
  );
}

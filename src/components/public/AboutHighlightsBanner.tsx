import React from 'react';
import { useI18n } from '../I18nProvider';

export function AboutHighlightsBanner() {
  const { messages } = useI18n();

  const highlights = [
    {
      key: 'team',
      title: messages.aboutHighlights.teamTitle,
      body: messages.aboutHighlights.teamBody,
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 text-brand-500" aria-hidden="true">
          <path
            d="M19 25c4.142 0 7.5-3.358 7.5-7.5S23.142 10 19 10s-7.5 3.358-7.5 7.5S14.858 25 19 25Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 39c0-5.799 5.149-10.5 11.5-10.5S30.5 33.201 30.5 39"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M30.5 11.5c3.314 0 6 2.686 6 6s-2.686 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M32 29.2c4.9.8 8.5 4.8 8.5 9.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: 'destinations',
      title: messages.aboutHighlights.destinationsTitle,
      body: messages.aboutHighlights.destinationsBody,
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 text-brand-500" aria-hidden="true">
          <path
            d="M15.5 29s-7-7.2-7-12.5a7 7 0 1 1 14 0c0 5.3-7 12.5-7 12.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="15.5" cy="16.5" r="2.3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M34 22s-5.5-5.6-5.5-9.8a5.5 5.5 0 1 1 11 0c0 4.2-5.5 9.8-5.5 9.8Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="34" cy="12.2" r="1.8" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M16 33.5c4 5.5 14 6 19.5 1.5s4-10-1.5-10.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="2.5 3.5"
          />
        </svg>
      ),
    },
    {
      key: 'hotels',
      title: messages.aboutHighlights.hotelsTitle,
      body: messages.aboutHighlights.hotelsBody,
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 text-brand-500" aria-hidden="true">
          <path
            d="M11 24V13.5A2.5 2.5 0 0 1 13.5 11h21a2.5 2.5 0 0 1 2.5 2.5V24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect
            x="14.5"
            y="17.5"
            width="8"
            height="4.5"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <rect
            x="25.5"
            y="17.5"
            width="8"
            height="4.5"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M7.5 26.5A2.5 2.5 0 0 1 10 24h28a2.5 2.5 0 0 1 2.5 2.5V35h-33v-8.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 35v3.5M37.5 35v3.5M7.5 30.5h33"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: 'transport',
      title: messages.aboutHighlights.transportTitle,
      body: messages.aboutHighlights.transportBody,
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 text-brand-500" aria-hidden="true">
          <path
            d="M14 14V9.5A1.5 1.5 0 0 1 15.5 8h5A1.5 1.5 0 0 1 22 9.5V14"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="10.5"
            y="14"
            width="15"
            height="22"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M15 19v12M21 19v12M13.5 36v2.5M22.5 36v2.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="23.5"
            y="22.5"
            width="15.5"
            height="13.5"
            rx="2.5"
            fill="#231A12"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M28.5 22.5v-2a2.5 2.5 0 0 1 5 0v2M27.5 29h7.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative overflow-hidden bg-ink text-white py-14 sm:py-16 border-y border-brand-600/25">
      <img
        src="/src/assets/images/hero_dahab_redsea_1795599272813.jpg"
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-35"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(35, 26, 18, 0.88) 0%, rgba(56, 30, 14, 0.80) 50%, rgba(35, 26, 18, 0.92) 100%)',
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 text-center">
          {highlights.map((item) => (
            <div key={item.key} className="flex flex-col items-center">
              <div className="mb-4 flex items-center justify-center">{item.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2.5">{item.title}</h3>
              <p className="text-sm text-white/75 leading-relaxed max-w-[240px]">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

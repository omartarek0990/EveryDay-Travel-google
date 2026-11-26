import React, { useState } from 'react';
import { Mountain } from 'lucide-react';

export function ResilientImage({
  src,
  alt,
  className = '',
  loading = 'lazy',
  fetchPriority,
  aspectClass = '',
}: {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  aspectClass?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-surface-alt via-brand-100/60 to-surface-alt text-muted ${aspectClass} ${className}`}
      >
        <Mountain className="w-8 h-8 text-brand-600/50 mb-1.5" aria-hidden="true" />
        <span className="text-xs font-medium px-3 text-center line-clamp-1">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`bg-surface-alt ${aspectClass} ${className}`}
    />
  );
}

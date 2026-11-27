import React, { useState } from 'react';
import { Mountain } from 'lucide-react';
import type { ImageRecord } from '../shared/types';
import { imageProps } from '../lib/image-url';

export function ResilientImage({
  image,
  src,
  alt,
  className = '',
  loading = 'lazy',
  fetchPriority,
  aspectClass = '',
  sizes,
  maxWidth,
  width,
  height,
  onLoad,
  onError,
  imgRef,
}: {
  /** Image row with optional responsive variants. Preferred over `src`. */
  image?: ImageRecord | null;
  /** Plain URL fallback for callers that only have a string. */
  src?: string | null;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  aspectClass?: string;
  sizes?: string;
  maxWidth?: number;
  width?: number;
  height?: number;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  /** Called before the built-in failure fallback replaces the image. */
  onError?: React.ReactEventHandler<HTMLImageElement>;
  imgRef?: React.Ref<HTMLImageElement>;
}) {
  const [failed, setFailed] = useState(false);

  const resolved = image
    ? imageProps(image, { sizes, maxWidth })
    : {
        src: src ?? null,
        srcSet: undefined as string | undefined,
        sizes: undefined as string | undefined,
        width: width ?? 0,
        height: height ?? 0,
        backgroundColor: undefined as string | undefined,
      };

  if (!resolved.src || failed) {
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
      ref={imgRef}
      src={resolved.src}
      srcSet={resolved.srcSet}
      sizes={resolved.sizes}
      width={resolved.width || undefined}
      height={resolved.height || undefined}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={onLoad}
      onError={(event) => {
        onError?.(event);
        setFailed(true);
      }}
      style={
        resolved.backgroundColor ? { backgroundColor: resolved.backgroundColor } : undefined
      }
      className={`bg-surface-alt ${aspectClass} ${className}`}
    />
  );
}

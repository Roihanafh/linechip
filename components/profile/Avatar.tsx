'use client';

import { useState } from 'react';
import { getInitials } from '@/features/profile/utils/providerUtils';

// Size map: sm=32px, md=48px, lg=80px, xl=128px
const SIZE_MAP = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 128,
} as const;

interface AvatarProps {
  photoURL?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Avatar({
  photoURL,
  name,
  size = 'md',
  className = '',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const px = SIZE_MAP[size];
  const showFallback = !photoURL || imgError;

  const containerStyle: React.CSSProperties = {
    width: px,
    height: px,
    minWidth: px,
    minHeight: px,
  };

  // Determine font size based on avatar size
  const fontSize =
    size === 'xl'
      ? '2.5rem'
      : size === 'lg'
        ? '1.75rem'
        : size === 'sm'
          ? '0.75rem'
          : '1rem';

  if (showFallback) {
    return (
      <div
        role="img"
        aria-label={`Foto profil ${name}`}
        className={`flex items-center justify-center rounded-full bg-[#2563eb] text-white font-semibold select-none overflow-hidden ${className}`}
        style={{ ...containerStyle, fontSize }}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <div
      role="img"
      aria-label={`Foto profil ${name}`}
      className={`rounded-full overflow-hidden shrink-0 ${className}`}
      style={containerStyle}
    >
      {/* Using plain <img> for external URLs (e.g. Google CDN) to avoid requiring
          next.config remotePatterns. onError triggers fallback to initials. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoURL}
        alt={name}
        width={px}
        height={px}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

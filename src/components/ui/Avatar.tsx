'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useState } from 'react';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-20 h-20',
  xl: 'w-32 h-32',
};

export function Avatar({ src, alt, size = 'md', className, onClick }: AvatarProps) {
  const [error, setError] = useState(false);
  const clickableClass = onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : '';

  const fallback = (
    <div
      className={cn(
        'rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold',
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {alt.charAt(0).toUpperCase()}
    </div>
  );

  if (!src || error) {
    return fallback;
  }

  const pixelSize = size === 'xl' ? 128 : size === 'lg' ? 80 : size === 'md' ? 48 : size === 'sm' ? 32 : 24;

  return (
    <Image
      src={src}
      alt={alt}
      width={pixelSize}
      height={pixelSize}
      sizes={`${pixelSize}px`}
      className={cn('rounded-full object-cover', sizeClasses[size], clickableClass, className)}
      onError={() => setError(true)}
      onClick={onClick}
      loading="lazy"
    />
  );
}

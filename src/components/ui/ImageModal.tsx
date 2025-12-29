'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  alt?: string;
  initialIndex?: number;
}

// Only allow HTTPS images for security
const isSecureUrl = (url: string) => url.startsWith('https://');

export function ImageModal({ isOpen, onClose, images: rawImages, alt = 'Image', initialIndex = 0 }: ImageModalProps) {
  // Filter out insecure HTTP images
  const images = useMemo(() => rawImages.filter(isSecureUrl), [rawImages]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Reset index when initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Handle keyboard events - define handler inside effect to avoid dependency issues
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        setCurrentIndex((i) => (i + 1) % images.length);
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        setCurrentIndex((i) => (i - 1 + images.length) % images.length);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, images.length]);

  const goNext = () => {
    setCurrentIndex((i) => (i + 1) % images.length);
  };

  const goPrev = () => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  };

  if (!isOpen || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/90" />

      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white cursor-pointer transition-colors"
        aria-label="Close"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-4 z-10 p-2 text-white/70 hover:text-white cursor-pointer transition-colors"
            aria-label="Previous"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-4 z-10 p-2 text-white/70 hover:text-white cursor-pointer transition-colors"
            aria-label="Next"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={images[currentIndex]}
          alt={`${alt} ${images.length > 1 ? currentIndex + 1 : ''}`}
          width={1200}
          height={800}
          sizes="90vw"
          className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                index === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

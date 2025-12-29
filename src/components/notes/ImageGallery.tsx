'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ImageModal } from '@/components/ui/ImageModal';
import type { ImetaData } from '@/lib/nostr/nips/nip92';

export interface GalleryImage {
  url: string;
  alt?: string;
  dimensions?: { width: number; height: number };
  blurhash?: string;
  mimeType?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  className?: string;
}

// Only allow HTTPS images for security
const isSecureUrl = (url: string) => url.startsWith('https://');

export function ImageGallery({ images: rawImages, className }: ImageGalleryProps) {
  // Filter out insecure HTTP images
  const images = useMemo(() => rawImages.filter(img => isSecureUrl(img.url)), [rawImages]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());

  if (images.length === 0) return null;

  const handleImageClick = (index: number) => {
    setSelectedIndex(index);
    setModalOpen(true);
  };

  const handleError = (index: number) => {
    setErrors((prev) => new Set(prev).add(index));
  };

  const imageUrls = images.map((img) => img.url);
  const validImages = images.filter((_, i) => !errors.has(i));

  if (validImages.length === 0) return null;

  // Single image layout
  if (images.length === 1) {
    if (errors.has(0)) return null;
    const img = images[0];
    return (
      <>
        <div
          className={cn('flex justify-center overflow-hidden rounded-xl cursor-pointer bg-muted', className)}
          onClick={() => handleImageClick(0)}
        >
          <Image
            src={img.url}
            alt={img.alt || ''}
            width={img.dimensions?.width || 800}
            height={img.dimensions?.height || 600}
            sizes="(max-width: 768px) 100vw, 800px"
            className="max-w-full h-auto max-h-96 object-contain hover:opacity-90 transition-opacity"
            onError={() => handleError(0)}
            loading="lazy"
          />
        </div>
        <ImageModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          images={imageUrls}
          initialIndex={selectedIndex}
          alt={img.alt}
        />
      </>
    );
  }

  // Two images layout - side by side
  if (images.length === 2) {
    return (
      <>
        <div className={cn('grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden', className)}>
          {images.map((img, i) => (
            !errors.has(i) && (
              <div
                key={i}
                className="aspect-square cursor-pointer"
                onClick={() => handleImageClick(i)}
              >
                <Image
                  src={img.url}
                  alt={img.alt || ''}
                  width={400}
                  height={400}
                  sizes="(max-width: 768px) 50vw, 400px"
                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                  onError={() => handleError(i)}
                  loading="lazy"
                />
              </div>
            )
          ))}
        </div>
        <ImageModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          images={imageUrls}
          initialIndex={selectedIndex}
        />
      </>
    );
  }

  // Three images - one large left, two stacked right
  if (images.length === 3) {
    return (
      <>
        <div className={cn('grid grid-cols-3 grid-rows-2 gap-0.5 rounded-xl overflow-hidden aspect-[3/2]', className)}>
          {!errors.has(0) && (
            <div
              className="col-span-2 row-span-2 cursor-pointer"
              onClick={() => handleImageClick(0)}
            >
              <Image
                src={images[0].url}
                alt={images[0].alt || ''}
                width={600}
                height={600}
                sizes="(max-width: 768px) 66vw, 600px"
                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                onError={() => handleError(0)}
                loading="lazy"
              />
            </div>
          )}
          {images.slice(1).map((img, i) => (
            !errors.has(i + 1) && (
              <div
                key={i + 1}
                className="cursor-pointer"
                onClick={() => handleImageClick(i + 1)}
              >
                <Image
                  src={img.url}
                  alt={img.alt || ''}
                  width={300}
                  height={300}
                  sizes="(max-width: 768px) 33vw, 300px"
                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                  onError={() => handleError(i + 1)}
                  loading="lazy"
                />
              </div>
            )
          ))}
        </div>
        <ImageModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          images={imageUrls}
          initialIndex={selectedIndex}
        />
      </>
    );
  }

  // 4+ images - 2x2 grid with overlay for additional
  const displayImages = images.slice(0, 4);
  const remainingCount = images.length - 4;

  return (
    <>
      <div className={cn('grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden', className)}>
        {displayImages.map((img, i) => (
          !errors.has(i) && (
            <div
              key={i}
              className="relative aspect-square cursor-pointer"
              onClick={() => handleImageClick(i)}
            >
              <Image
                src={img.url}
                alt={img.alt || ''}
                width={400}
                height={400}
                sizes="(max-width: 768px) 50vw, 400px"
                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                onError={() => handleError(i)}
                loading="lazy"
              />
              {i === 3 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">+{remainingCount}</span>
                </div>
              )}
            </div>
          )
        ))}
      </div>
      <ImageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        images={imageUrls}
        initialIndex={selectedIndex}
      />
    </>
  );
}

/**
 * Helper to convert ParsedPart images and imeta data to GalleryImage format
 */
export function toGalleryImages(
  urls: string[],
  imetaMap?: Map<string, ImetaData>
): GalleryImage[] {
  return urls.map((url) => {
    const imeta = imetaMap?.get(url);
    return {
      url,
      alt: imeta?.alt,
      dimensions: imeta?.dimensions,
      blurhash: imeta?.blurhash,
      mimeType: imeta?.mimeType,
    };
  });
}

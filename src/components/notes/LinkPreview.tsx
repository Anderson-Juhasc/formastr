'use client';

import { useState, useEffect } from 'react';

interface LinkPreviewProps {
  url: string;
}

interface OgData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const youtubeId = getYouTubeId(url);

  useEffect(() => {
    if (youtubeId) {
      setLoading(false);
      return;
    }

    async function fetchOgData() {
      try {
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    }

    fetchOgData();
  }, [url, youtubeId]);

  if (youtubeId) {
    return (
      <div className="mt-3 rounded-lg overflow-hidden aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="YouTube video"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-3 h-24 bg-muted rounded-lg animate-pulse" />
    );
  }

  if (error || !ogData) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block border-2 border-border rounded-lg p-3 hover:bg-accent transition-colors bg-card shadow-sm"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <span className="truncate">{new URL(url).hostname}</span>
        </div>
        <p className="mt-1 text-primary truncate text-sm font-medium">
          {url}
        </p>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 block border-2 border-border rounded-lg overflow-hidden hover:bg-accent transition-colors bg-card shadow-sm"
    >
      {ogData.image && (
        <img
          src={ogData.image}
          alt=""
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-3">
        {ogData.siteName && (
          <p className="text-xs text-muted-foreground mb-1 font-medium">
            {ogData.siteName}
          </p>
        )}
        {ogData.title && (
          <p className="font-semibold text-card-foreground line-clamp-2">
            {ogData.title}
          </p>
        )}
        {ogData.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {ogData.description}
          </p>
        )}
      </div>
    </a>
  );
}

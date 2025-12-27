'use client';

import { useState, useEffect } from 'react';

interface YouTubeEmbedProps {
  videoId: string;
}

export function YouTubeEmbed({ videoId }: YouTubeEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  );

  // Try to load maxresdefault, fall back to hqdefault if it doesn't exist
  useEffect(() => {
    const maxresUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const img = new Image();
    img.onload = () => {
      // maxresdefault exists and loaded successfully
      // Check if it's not the default 404 placeholder (120x90)
      if (img.naturalWidth > 120) {
        setThumbnailUrl(maxresUrl);
      }
    };
    img.src = maxresUrl;
  }, [videoId]);

  if (loaded) {
    return (
      <div className="rounded-lg overflow-hidden aspect-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title="YouTube video"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setLoaded(true)}
      className="relative w-full aspect-video rounded-lg overflow-hidden group cursor-pointer"
    >
      <img
        src={thumbnailUrl}
        alt="YouTube video thumbnail"
        className="w-full h-full object-cover"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
          <svg
            className="w-8 h-8 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      {/* YouTube logo */}
      <div className="absolute bottom-3 right-3 bg-black/70 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        YouTube
      </div>
    </button>
  );
}

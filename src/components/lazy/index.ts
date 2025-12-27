'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
import { createElement } from 'react';

// Lazy loaded LinkPreview - fetches external URLs
export const LazyLinkPreview = dynamic(
  () => import('@/components/notes/LinkPreview').then((mod) => mod.LinkPreview),
  {
    ssr: false,
    loading: () =>
      createElement('div', {
        className: 'mt-3 h-20 bg-muted rounded-lg animate-pulse',
      }),
  }
);

// Lazy loaded YouTubeEmbed - renders iframe
export const LazyYouTubeEmbed = dynamic(
  () => import('@/components/notes/YouTubeEmbed').then((mod) => mod.YouTubeEmbed),
  {
    ssr: false,
    loading: () =>
      createElement('div', {
        className: 'aspect-video bg-muted rounded-lg animate-pulse',
      }),
  }
);

// Lazy loaded EmbeddedNote - fetches nested notes
export const LazyEmbeddedNote = dynamic(
  () => import('@/components/notes/EmbeddedNote').then((mod) => mod.EmbeddedNote),
  {
    ssr: false,
    loading: () =>
      createElement('div', {
        className: 'my-2 border-2 border-border rounded-lg p-3 bg-card',
        children: [
          createElement('div', {
            key: 'avatar',
            className: 'flex items-center gap-2 mb-2',
            children: [
              createElement(Skeleton, { key: 's1', className: 'w-6 h-6 rounded-full' }),
              createElement(Skeleton, { key: 's2', className: 'h-4 w-24' }),
            ],
          }),
          createElement(Skeleton, { key: 's3', className: 'h-4 w-full' }),
          createElement(Skeleton, { key: 's4', className: 'h-4 w-3/4 mt-1' }),
        ],
      }),
  }
);

// Lazy loaded ReplyList - heavy component for note pages
export const LazyReplyList = dynamic(
  () => import('@/components/notes/ReplyList').then((mod) => mod.ReplyList),
  {
    ssr: false,
    loading: () =>
      createElement('div', {
        className: 'space-y-4',
        children: [
          createElement('h2', {
            key: 'h',
            className: 'text-lg font-semibold text-foreground',
            children: 'Comments',
          }),
          createElement(Skeleton, { key: 's1', className: 'h-24 w-full rounded-lg' }),
          createElement(Skeleton, { key: 's2', className: 'h-24 w-full rounded-lg' }),
        ],
      }),
  }
);

// Lazy loaded NoteStats - fetches engagement data
export const LazyNoteStats = dynamic(
  () => import('@/components/notes/NoteStats').then((mod) => mod.NoteStatsBar),
  {
    ssr: false,
    loading: () =>
      createElement('div', {
        className: 'flex items-center gap-4 text-sm text-muted-foreground',
        children: createElement(Skeleton, { className: 'h-4 w-32' }),
      }),
  }
);

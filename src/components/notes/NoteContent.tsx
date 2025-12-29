'use client';

import { memo, useMemo, useState } from 'react';
import { parseNoteContent, ParsedPart } from '@/lib/nostr/content';
import { LazyLinkPreview, LazyYouTubeEmbed, LazyEmbeddedNote } from '@/components/lazy';
import { MentionLink } from './MentionLink';
import { ImageGallery, toGalleryImages } from './ImageGallery';
import { parseImetaTags } from '@/lib/nostr/nips/nip92';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface NoteContentProps {
  content: string;
  tags: string[][];
  depth?: number; // For embedded note depth tracking
}

// Inline types that should flow together without breaks
const INLINE_TYPES = new Set(['text', 'mention', 'nostr', 'hashtag', 'invoice', 'code', 'emoji', 'inline-image']);

export const NoteContent = memo(function NoteContent({ content, tags, depth = 0 }: NoteContentProps) {
  // Memoize expensive parsing
  const parts = useMemo(() => parseNoteContent(content, tags), [content, tags]);

  // Parse imeta tags for image metadata
  const imetaMap = useMemo(() => parseImetaTags(tags), [tags]);

  // Group consecutive inline parts and images together (memoized)
  const groups = useMemo(() => {
    const result: { type: 'inline' | 'block' | 'image-gallery'; parts: ParsedPart[] }[] = [];

    // Helper to check if a part is whitespace-only text
    const isWhitespaceOnly = (part: ParsedPart) =>
      part.type === 'text' && /^\s*$/.test(part.content);

    // First pass: collect all images and mark whitespace between them
    // We need to look ahead to know if whitespace should be absorbed into gallery
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isInline = INLINE_TYPES.has(part.type);
      const isImage = part.type === 'image';

      if (isImage) {
        // Group consecutive images for gallery display
        const lastGroup = result[result.length - 1];
        if (lastGroup?.type === 'image-gallery') {
          lastGroup.parts.push(part);
        } else {
          result.push({ type: 'image-gallery', parts: [part] });
        }
      } else if (isWhitespaceOnly(part)) {
        // Check if there's an image coming after this whitespace
        const nextNonWhitespace = parts.slice(i + 1).find((p) => !isWhitespaceOnly(p));
        const lastGroup = result[result.length - 1];

        // If we're in an image gallery and next content is also an image, skip this whitespace
        if (lastGroup?.type === 'image-gallery' && nextNonWhitespace?.type === 'image') {
          continue; // Skip whitespace between images
        }

        // Otherwise treat as normal inline
        if (lastGroup?.type === 'inline') {
          lastGroup.parts.push(part);
        } else {
          result.push({ type: 'inline', parts: [part] });
        }
      } else if (isInline) {
        const lastGroup = result[result.length - 1];
        if (lastGroup?.type === 'inline') {
          lastGroup.parts.push(part);
        } else {
          result.push({ type: 'inline', parts: [part] });
        }
      } else {
        result.push({ type: 'block', parts: [part] });
      }
    }

    // Filter out empty inline groups (whitespace-only that got absorbed)
    return result.filter((group) => {
      if (group.type === 'inline') {
        return group.parts.some((p) => !isWhitespaceOnly(p));
      }
      return true;
    });
  }, [parts]);

  return (
    <ErrorBoundary fallback={<div className="text-muted-foreground italic">Content failed to load</div>}>
      <div className="space-y-3">
        {groups.map((group, i) => {
          if (group.type === 'inline') {
            return (
              <div key={i} className="whitespace-pre-wrap break-words">
                {group.parts.map((part, j) => (
                  <RenderInlinePart key={j} part={part} />
                ))}
              </div>
            );
          } else if (group.type === 'image-gallery') {
            const imageUrls = group.parts.map((p) => p.href!);
            const galleryImages = toGalleryImages(imageUrls, imetaMap);
            return <ImageGallery key={i} images={galleryImages} />;
          } else {
            return <RenderBlockPart key={i} part={group.parts[0]} depth={depth} />;
          }
        })}
      </div>
    </ErrorBoundary>
  );
});

function RenderInlinePart({ part }: { part: ParsedPart }) {
  switch (part.type) {
    case 'text':
      return <>{part.content}</>;

    case 'mention':
      if (part.pubkey) {
        return (
          <MentionLink
            pubkey={part.pubkey}
            href={part.href || '/'}
            fallback={part.content}
          />
        );
      }
      return (
        <span className="text-primary">
          {part.content}
        </span>
      );

    case 'nostr':
      return (
        <span className="text-primary">
          {part.content}
        </span>
      );

    case 'hashtag':
      return (
        <span className="text-primary">{part.content}</span>
      );

    case 'invoice':
      return (
        <span className="inline-block bg-accent text-accent-foreground px-2 py-1 rounded text-sm font-mono break-all">
          {part.content.slice(0, 20)}...
        </span>
      );

    case 'code':
      return (
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono">
          {part.content}
        </code>
      );

    case 'emoji':
      return <InlineEmoji part={part} />;

    case 'inline-image':
      return <InlineImage part={part} />;

    default:
      return null;
  }
}

function InlineEmoji({ part }: { part: ParsedPart }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span>{part.content}</span>;
  }

  return (
    <img
      src={part.emojiUrl}
      alt={`:${part.shortcode}:`}
      title={`:${part.shortcode}:`}
      className="inline-emoji inline-block h-5 w-5 align-text-bottom"
      onError={() => setFailed(true)}
    />
  );
}

function InlineImage({ part }: { part: ParsedPart }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <a
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline break-all"
      >
        {part.href}
      </a>
    );
  }

  return (
    <img
      src={part.href}
      alt=""
      className="inline-block max-h-20 align-text-bottom rounded"
      onError={() => setFailed(true)}
    />
  );
}

function RenderBlockPart({ part, depth }: { part: ParsedPart; depth: number }) {
  switch (part.type) {
    case 'video':
      return (
        <div className="flex justify-center overflow-hidden rounded-xl bg-muted">
          <video
            src={part.href}
            controls
            className="max-w-full h-auto max-h-96 object-contain"
            preload="metadata"
          />
        </div>
      );

    case 'youtube':
      return <LazyYouTubeEmbed videoId={part.videoId!} />;

    case 'url':
      return <LazyLinkPreview url={part.href!} />;

    case 'embedded-note':
      return <LazyEmbeddedNote noteId={part.noteId!} depth={depth} />;

    default:
      return null;
  }
}

'use client';

import { parseNoteContent, ParsedPart } from '@/lib/nostr/content';
import { YouTubeEmbed } from './YouTubeEmbed';
import { MentionSpan } from './MentionLink';

interface EmbeddedNoteContentProps {
  content: string;
  tags: string[][];
}

const INLINE_TYPES = new Set(['text', 'mention', 'nostr', 'hashtag', 'invoice', 'code']);

export function EmbeddedNoteContent({ content, tags }: EmbeddedNoteContentProps) {
  const parts = parseNoteContent(content, tags);
  const groups: { type: 'inline' | 'block'; parts: ParsedPart[] }[] = [];

  for (const part of parts) {
    const isInline = INLINE_TYPES.has(part.type) || part.type === 'embedded-note';

    if (isInline) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup?.type === 'inline') {
        lastGroup.parts.push(part);
      } else {
        groups.push({ type: 'inline', parts: [part] });
      }
    } else {
      groups.push({ type: 'block', parts: [part] });
    }
  }

  return (
    <div className="space-y-2">
      {groups.map((group, i) => {
        if (group.type === 'inline') {
          return (
            <div key={i} className="whitespace-pre-wrap break-words">
              {group.parts.map((part, j) => (
                <RenderInlinePart key={j} part={part} />
              ))}
            </div>
          );
        } else {
          return <RenderBlockPart key={i} part={group.parts[0]} />;
        }
      })}
    </div>
  );
}

function RenderInlinePart({ part }: { part: ParsedPart }) {
  switch (part.type) {
    case 'text':
      return <>{part.content}</>;

    case 'mention':
      if (part.pubkey) {
        return (
          <MentionSpan
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
        <span className="inline-block bg-accent text-accent-foreground px-1 py-0.5 rounded text-xs font-mono">
          {part.content.slice(0, 16)}...
        </span>
      );

    case 'code':
      return (
        <code className="bg-muted text-foreground px-1 py-0.5 rounded text-xs font-mono">
          {part.content}
        </code>
      );

    case 'embedded-note':
      return (
        <span className="text-primary">
          [quoted note]
        </span>
      );

    default:
      return null;
  }
}

function RenderBlockPart({ part }: { part: ParsedPart }) {
  switch (part.type) {
    case 'image':
      return (
        <div
          className="block overflow-hidden rounded cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(part.href, '_blank', 'noopener,noreferrer');
          }}
        >
          <img
            src={part.href}
            alt=""
            className="max-w-full h-auto max-h-48 rounded hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </div>
      );

    case 'video':
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <video
            src={part.href}
            controls
            className="max-w-full max-h-48 rounded"
            preload="metadata"
          />
        </div>
      );

    case 'youtube':
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <YouTubeEmbed videoId={part.videoId!} />
        </div>
      );

    case 'url':
      return (
        <span
          className="text-primary hover:underline cursor-pointer text-sm break-all"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(part.href, '_blank', 'noopener,noreferrer');
          }}
        >
          {part.href}
        </span>
      );

    default:
      return null;
  }
}

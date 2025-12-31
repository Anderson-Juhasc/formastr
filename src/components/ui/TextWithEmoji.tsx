'use client';

import { useMemo, useState, memo } from 'react';

interface TextWithEmojiProps {
  text: string;
  emojiTags?: string[][];
  className?: string;
}

interface ParsedSegment {
  type: 'text' | 'emoji';
  content: string;
  emojiUrl?: string;
}

// NIP-30: shortcode pattern - alphanumeric and underscores only
const EMOJI_PATTERN = /:([a-zA-Z0-9_]+):/g;

function buildEmojiMap(tags?: string[][]): Map<string, string> {
  const map = new Map<string, string>();
  if (!tags) return map;

  for (const tag of tags) {
    if (tag[0] === 'emoji' && tag[1] && tag[2]) {
      map.set(tag[1], tag[2]);
    }
  }
  return map;
}

function parseTextWithEmojis(text: string, emojiMap: Map<string, string>): ParsedSegment[] {
  if (emojiMap.size === 0) {
    return [{ type: 'text', content: text }];
  }

  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  // Reset regex state
  EMOJI_PATTERN.lastIndex = 0;

  let match;
  while ((match = EMOJI_PATTERN.exec(text)) !== null) {
    const shortcode = match[1];
    const emojiUrl = emojiMap.get(shortcode);

    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    if (emojiUrl) {
      // Valid emoji found
      segments.push({
        type: 'emoji',
        content: `:${shortcode}:`,
        emojiUrl,
      });
    } else {
      // No matching emoji tag - keep as text
      segments.push({
        type: 'text',
        content: match[0],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

const InlineEmoji = memo(function InlineEmoji({
  url,
  shortcode
}: {
  url: string;
  shortcode: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span>{`:${shortcode}:`}</span>;
  }

  return (
    <img
      src={url}
      alt={`:${shortcode}:`}
      title={`:${shortcode}:`}
      className="inline-block h-[1.2em] w-[1.2em] align-text-bottom object-contain"
      onError={() => setFailed(true)}
    />
  );
});

export const TextWithEmoji = memo(function TextWithEmoji({
  text,
  emojiTags,
  className
}: TextWithEmojiProps) {
  const emojiMap = useMemo(() => buildEmojiMap(emojiTags), [emojiTags]);
  const segments = useMemo(() => parseTextWithEmojis(text, emojiMap), [text, emojiMap]);

  // Fast path: no emojis to render
  if (emojiMap.size === 0 || segments.length === 1 && segments[0].type === 'text') {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {segments.map((segment, i) => {
        if (segment.type === 'emoji' && segment.emojiUrl) {
          const shortcode = segment.content.slice(1, -1); // Remove colons
          return <InlineEmoji key={i} url={segment.emojiUrl} shortcode={shortcode} />;
        }
        return <span key={i}>{segment.content}</span>;
      })}
    </span>
  );
});

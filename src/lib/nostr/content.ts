/**
 * Content parsing for Nostr notes
 *
 * This module handles parsing note content into structured parts for rendering.
 * It uses NIP implementations for handling references:
 * - NIP-10: Reply threading (getReplyToId)
 * - NIP-19: Bech32 decoding
 * - NIP-21: nostr: URI parsing
 * - NIP-27: Text references
 */

import { transformText, FragmentType, ParsedFragment } from '@snort/system';
import { NostrLink, tryParseNostrLink } from '@snort/system';
import * as nip19 from './nips/nip19';
import * as nip21 from './nips/nip21';

// Re-export NIP-10 getReplyToId for backwards compatibility
export { getReplyToId } from './nips/nip10';

export interface ParsedPart {
  type: 'text' | 'url' | 'image' | 'video' | 'youtube' | 'mention' | 'hashtag' | 'nostr' | 'embedded-note' | 'invoice' | 'code' | 'emoji' | 'inline-image';
  content: string;
  href?: string;
  videoId?: string;
  noteId?: string;
  pubkey?: string;
  mimeType?: string;
  language?: string;
  shortcode?: string;
  emojiUrl?: string;
}

const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;

/**
 * Convert a nostr: URI or bech32 to a ParsedPart
 */
function convertNostrReference(uriOrBech32: string): ParsedPart | null {
  const bech32 = nip21.extractBech32(uriOrBech32);
  const decoded = nip19.tryDecode(bech32);

  if (!decoded) return null;

  // Event references (embedded notes)
  if (decoded.type === 'note' || decoded.type === 'nevent' || decoded.type === 'naddr') {
    return {
      type: 'embedded-note',
      content: '',
      noteId: bech32,
    };
  }

  // Profile references (mentions)
  if (decoded.type === 'npub') {
    return {
      type: 'mention',
      content: '@' + bech32.slice(0, 12) + '...',
      href: `/${bech32}`,
      pubkey: decoded.data,
    };
  }

  if (decoded.type === 'nprofile') {
    return {
      type: 'mention',
      content: '@' + bech32.slice(0, 12) + '...',
      href: `/${bech32}`,
      pubkey: decoded.data.pubkey,
    };
  }

  return null;
}

/**
 * Build emoji map from tags for NIP-30 custom emoji lookup
 */
function buildEmojiMap(tags: string[][]): Map<string, string> {
  const map = new Map<string, string>();
  for (const tag of tags) {
    if (tag[0] === 'emoji' && tag[1] && tag[2]) {
      map.set(tag[1], tag[2]);
    }
  }
  return map;
}

/**
 * Convert @snort/system fragments to our ParsedPart format
 */
function convertFragment(fragment: ParsedFragment, emojiMap: Map<string, string>): ParsedPart | null {
  switch (fragment.type) {
    case FragmentType.Text: {
      // Check if text contains unprocessed nostr: URIs
      const nostrMatch = fragment.content.match(nip21.NOSTR_URI_REGEX);
      if (nostrMatch) {
        const result = convertNostrReference(nostrMatch[0]);
        if (result) return result;
      }
      return {
        type: 'text',
        content: fragment.content,
      };
    }

    case FragmentType.Link: {
      const url = fragment.content;

      // Check if it's a nostr: URI
      if (nip21.isNostrURI(url)) {
        const result = convertNostrReference(url);
        if (result) return result;
      }

      const youtubeMatch = url.match(YOUTUBE_REGEX);

      if (youtubeMatch) {
        return {
          type: 'youtube',
          content: url,
          href: url,
          videoId: youtubeMatch[1],
        };
      }

      // Check if it's a video URL
      if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)) {
        return {
          type: 'video',
          content: url,
          href: url,
        };
      }

      // Check if it's an image URL
      if (/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url)) {
        return {
          type: 'image',
          content: url,
          href: url,
        };
      }

      return {
        type: 'url',
        content: url,
        href: url,
      };
    }

    case FragmentType.Media: {
      const url = fragment.content;
      const mimeType = fragment.mimeType || '';

      // Check for YouTube in media too
      const youtubeMatch = url.match(YOUTUBE_REGEX);
      if (youtubeMatch) {
        return {
          type: 'youtube',
          content: url,
          href: url,
          videoId: youtubeMatch[1],
        };
      }

      if (mimeType.startsWith('video/') || /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)) {
        return {
          type: 'video',
          content: url,
          href: url,
          mimeType,
        };
      }

      if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url)) {
        return {
          type: 'image',
          content: url,
          href: url,
          mimeType,
        };
      }

      // Default to image for unknown media
      return {
        type: 'image',
        content: url,
        href: url,
        mimeType,
      };
    }

    case FragmentType.Mention: {
      // Try to get NostrLink from fragment.data or parse from content
      let link = fragment.data as NostrLink | undefined;

      if (!link) {
        // Try to parse the nostr: URI from content
        const content = fragment.content;
        const nostrUri = content.startsWith('nostr:') ? content.slice(6) : content;
        link = tryParseNostrLink(nostrUri);
      }

      if (!link) {
        // Fallback: try with our NIP-19 implementation
        const content = fragment.content;
        const bech32 = nip21.extractBech32(content);

        const result = convertNostrReference(bech32);
        if (result) return result;

        return {
          type: 'text',
          content: fragment.content,
        };
      }

      // Check if it's an event reference (note/nevent)
      if (link.type === 'note' || link.type === 'nevent') {
        return {
          type: 'embedded-note',
          content: '',
          noteId: link.encode(),
        };
      }

      // Check if it's an addressable event (naddr)
      if (link.type === 'naddr') {
        return {
          type: 'embedded-note',
          content: '',
          noteId: link.encode(),
        };
      }

      // Profile mentions (npub/nprofile)
      if (link.type === 'npub' || link.type === 'nprofile') {
        const encoded = link.encode();
        return {
          type: 'mention',
          content: '@' + encoded.slice(0, 12) + '...',
          href: `/${encoded}`,
          pubkey: link.id,
        };
      }

      return {
        type: 'nostr',
        content: fragment.content,
        href: '#',
      };
    }

    case FragmentType.Hashtag:
      return {
        type: 'hashtag',
        content: fragment.content.startsWith('#') ? fragment.content : '#' + fragment.content,
      };

    case FragmentType.Invoice:
      return {
        type: 'invoice',
        content: fragment.content,
      };

    case FragmentType.CodeBlock:
    case FragmentType.InlineCode:
      return {
        type: 'code',
        content: fragment.content,
        language: fragment.language,
      };

    case FragmentType.Cashu:
      return {
        type: 'text',
        content: '[Cashu token]',
      };

    case FragmentType.CustomEmoji: {
      // NIP-30: Custom emoji
      // @snort/system sets content to the emoji URL directly (from tag[2])
      // We need to reverse-lookup the shortcode from our emojiMap
      const emojiUrl = fragment.content;

      // Find the shortcode by looking for the URL in our emojiMap
      let shortcode: string | undefined;
      for (const [name, url] of emojiMap.entries()) {
        if (url === emojiUrl) {
          shortcode = name;
          break;
        }
      }

      if (shortcode && emojiUrl) {
        return {
          type: 'emoji',
          content: `:${shortcode}:`,
          shortcode,
          emojiUrl,
        };
      }

      // Fallback: if it looks like a URL, it's an unmatched emoji URL
      // Display the URL as a link instead of broken text
      if (emojiUrl.startsWith('http')) {
        return {
          type: 'url',
          content: emojiUrl,
          href: emojiUrl,
        };
      }

      // Fallback to text if no match found
      return {
        type: 'text',
        content: emojiUrl,
      };
    }

    default:
      return {
        type: 'text',
        content: fragment.content,
      };
  }
}

/**
 * Split text containing bare npubs/nprofiles into multiple parts
 */
function splitTextWithMentions(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  let lastIndex = 0;

  // Reset regex state
  nip21.BARE_BECH32_REGEX.lastIndex = 0;

  let match;
  while ((match = nip21.BARE_BECH32_REGEX.exec(text)) !== null) {
    const bech32 = match[1];

    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Try to convert the bech32
    const result = convertNostrReference(bech32);
    if (result) {
      parts.push(result);
    } else {
      // Invalid bech32, keep as text
      parts.push({
        type: 'text',
        content: bech32,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return parts;
}

/**
 * Detect if an image should be rendered inline (surrounded by text) or as block
 * Images are only inline when truly embedded between text (text on BOTH sides)
 */
function detectInlineImages(parts: ParsedPart[]): ParsedPart[] {
  return parts.map((part, i) => {
    if (part.type !== 'image') return part;

    // Check if there's non-whitespace text before this image (on same line)
    const prevPart = parts[i - 1];
    const hasTextBefore = prevPart?.type === 'text' &&
      !/\n\s*$/.test(prevPart.content) &&
      prevPart.content.trim().length > 0;

    // Check if there's non-whitespace text after this image (on same line)
    const nextPart = parts[i + 1];
    const hasTextAfter = nextPart?.type === 'text' &&
      !/^\s*\n/.test(nextPart.content) &&
      nextPart.content.trim().length > 0;

    // Only make inline if surrounded by text on BOTH sides (truly embedded)
    // This prevents "emoji emoji [image]" from becoming tiny inline image
    if (hasTextBefore && hasTextAfter) {
      return { ...part, type: 'inline-image' as const };
    }

    return part;
  });
}

/**
 * Parse note content into structured parts for rendering
 */
export function parseNoteContent(content: string, tags: string[][]): ParsedPart[] {
  // Normalize whitespace: collapse 3+ newlines into 2, trim leading/trailing
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  // Build emoji map from tags for NIP-30 custom emoji support
  const emojiMap = buildEmojiMap(tags);

  // Use @snort/system's transformText for parsing
  const fragments = transformText(content, tags);

  // Convert fragments to our format
  const parts: ParsedPart[] = [];

  for (const fragment of fragments) {
    const part = convertFragment(fragment, emojiMap);
    if (part) {
      // If it's a text part, check for bare npubs
      if (part.type === 'text' && nip21.BARE_BECH32_REGEX.test(part.content)) {
        parts.push(...splitTextWithMentions(part.content));
      } else {
        parts.push(part);
      }
    }
  }

  // Post-process to detect inline images
  return detectInlineImages(parts);
}

/**
 * Extract media URLs from note content
 */
export function getMediaFromContent(content: string): { images: string[]; videos: string[] } {
  const images: string[] = [];
  const videos: string[] = [];

  const urlRegex = /https?:\/\/[^\s<]+/gi;
  const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i;
  const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|ogg)(\?.*)?$/i;

  let match;

  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0];
    if (IMAGE_EXTENSIONS.test(url)) {
      images.push(url);
    } else if (VIDEO_EXTENSIONS.test(url)) {
      videos.push(url);
    }
  }

  return { images, videos };
}

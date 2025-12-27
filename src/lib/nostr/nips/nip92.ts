/**
 * NIP-92: Media Attachments
 * https://github.com/nostr-protocol/nips/blob/master/92.md
 *
 * Defines imeta tags for inline media metadata including:
 * - url: Media URL (required)
 * - m: MIME type
 * - dim: Dimensions (widthxheight)
 * - blurhash: Placeholder hash
 * - alt: Alt text description
 * - x: SHA-256 hash
 * - fallback: Alternative URLs
 */

export interface ImetaData {
  url: string;
  mimeType?: string;
  dimensions?: { width: number; height: number };
  blurhash?: string;
  alt?: string;
  hash?: string;
  fallback?: string[];
}

/**
 * Parse a single imeta tag into structured data
 * Format: ["imeta", "url https://...", "m image/jpeg", "dim 1920x1080", ...]
 */
export function parseImetaTag(tag: string[]): ImetaData | null {
  if (tag[0] !== 'imeta' || tag.length < 2) {
    return null;
  }

  const data: Partial<ImetaData> = {};
  const fallback: string[] = [];

  for (let i = 1; i < tag.length; i++) {
    const entry = tag[i];
    const spaceIndex = entry.indexOf(' ');

    if (spaceIndex === -1) continue;

    const key = entry.slice(0, spaceIndex);
    const value = entry.slice(spaceIndex + 1);

    switch (key) {
      case 'url':
        data.url = value;
        break;
      case 'm':
        data.mimeType = value;
        break;
      case 'dim': {
        const match = value.match(/^(\d+)x(\d+)$/);
        if (match) {
          data.dimensions = {
            width: parseInt(match[1], 10),
            height: parseInt(match[2], 10),
          };
        }
        break;
      }
      case 'blurhash':
        data.blurhash = value;
        break;
      case 'alt':
        data.alt = value;
        break;
      case 'x':
        data.hash = value;
        break;
      case 'fallback':
        fallback.push(value);
        break;
    }
  }

  if (!data.url) {
    return null;
  }

  return {
    url: data.url,
    mimeType: data.mimeType,
    dimensions: data.dimensions,
    blurhash: data.blurhash,
    alt: data.alt,
    hash: data.hash,
    fallback: fallback.length > 0 ? fallback : undefined,
  };
}

/**
 * Parse all imeta tags from event tags
 * Returns a Map keyed by URL for easy lookup
 */
export function parseImetaTags(tags: string[][]): Map<string, ImetaData> {
  const result = new Map<string, ImetaData>();

  for (const tag of tags) {
    const imeta = parseImetaTag(tag);
    if (imeta) {
      result.set(imeta.url, imeta);
    }
  }

  return result;
}

/**
 * Get imeta data for a specific URL
 */
export function getImetaForUrl(tags: string[][], url: string): ImetaData | undefined {
  const map = parseImetaTags(tags);
  return map.get(url);
}

/**
 * Check if an event has any imeta tags
 */
export function hasImetaTags(tags: string[][]): boolean {
  return tags.some((tag) => tag[0] === 'imeta');
}

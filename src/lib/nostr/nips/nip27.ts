/**
 * NIP-27: Text Note References
 * https://github.com/nostr-protocol/nips/blob/master/27.md
 *
 * Standardizes how references to other events and profiles appear in note content:
 * - Uses nostr: URI scheme (NIP-21)
 * - References should be displayed as interactive elements
 * - Clients should resolve and display profile names for npub/nprofile references
 */

import * as nip19 from './nip19';
import * as nip21 from './nip21';

export interface TextReference {
  /** Start index in the original text */
  start: number;
  /** End index in the original text */
  end: number;
  /** The matched text */
  text: string;
  /** Type of reference */
  type: 'mention' | 'note' | 'event';
  /** Bech32 identifier */
  bech32: string;
  /** Hex pubkey or event id */
  id: string;
  /** Optional relay hints */
  relays?: string[];
}

/**
 * Find all references in text content
 * Handles both nostr: URIs and bare bech32 strings
 */
export function findReferences(text: string): TextReference[] {
  const references: TextReference[] = [];
  const seen = new Set<number>(); // Track start positions to avoid duplicates

  // Find nostr: URIs
  nip21.NOSTR_URI_REGEX.lastIndex = 0;
  let match;
  while ((match = nip21.NOSTR_URI_REGEX.exec(text)) !== null) {
    if (seen.has(match.index)) continue;
    seen.add(match.index);

    const ref = parseReference(match[1], match.index, match[0].length);
    if (ref) references.push(ref);
  }

  // Find bare bech32 strings
  nip21.BARE_BECH32_REGEX.lastIndex = 0;
  while ((match = nip21.BARE_BECH32_REGEX.exec(text)) !== null) {
    if (seen.has(match.index)) continue;
    seen.add(match.index);

    const ref = parseReference(match[1], match.index, match[0].length);
    if (ref) references.push(ref);
  }

  // Sort by position
  references.sort((a, b) => a.start - b.start);

  return references;
}

/**
 * Parse a bech32 string into a TextReference
 */
function parseReference(bech32: string, start: number, length: number): TextReference | null {
  const decoded = nip19.tryDecode(bech32);
  if (!decoded) return null;

  const end = start + length;

  switch (decoded.type) {
    case 'npub':
      return {
        start,
        end,
        text: bech32,
        type: 'mention',
        bech32,
        id: decoded.data,
      };

    case 'nprofile':
      return {
        start,
        end,
        text: bech32,
        type: 'mention',
        bech32,
        id: decoded.data.pubkey,
        relays: decoded.data.relays,
      };

    case 'note':
      return {
        start,
        end,
        text: bech32,
        type: 'note',
        bech32,
        id: decoded.data,
      };

    case 'nevent':
      return {
        start,
        end,
        text: bech32,
        type: 'event',
        bech32,
        id: decoded.data.id,
        relays: decoded.data.relays,
      };

    case 'naddr':
      return {
        start,
        end,
        text: bech32,
        type: 'event',
        bech32,
        id: `${decoded.data.kind}:${decoded.data.pubkey}:${decoded.data.identifier}`,
        relays: decoded.data.relays,
      };

    default:
      return null;
  }
}

/**
 * Format a mention for display
 * Returns truncated bech32 with @ prefix
 */
export function formatMention(bech32: string, maxLength = 12): string {
  if (bech32.length <= maxLength) {
    return `@${bech32}`;
  }
  return `@${bech32.slice(0, maxLength)}...`;
}

/**
 * Build a mention string for inserting into text
 */
export function buildMention(pubkey: string, relays?: string[]): string {
  const bech32 = relays?.length
    ? nip19.encodeProfile(pubkey, relays)
    : nip19.hexToNpub(pubkey);
  return `nostr:${bech32}`;
}

/**
 * Build a note reference for inserting into text
 */
export function buildNoteReference(eventId: string, relays?: string[], author?: string): string {
  const bech32 = relays?.length || author
    ? nip19.encodeEvent(eventId, relays, author)
    : nip19.hexToNote(eventId);
  return `nostr:${bech32}`;
}

/**
 * Replace references in text with formatted versions
 * Useful for converting raw bech32 to nostr: URIs
 */
export function normalizeReferences(text: string): string {
  const refs = findReferences(text);
  if (refs.length === 0) return text;

  let result = '';
  let lastEnd = 0;

  for (const ref of refs) {
    // Add text before this reference
    result += text.slice(lastEnd, ref.start);
    // Add normalized nostr: URI
    result += `nostr:${ref.bech32}`;
    lastEnd = ref.end;
  }

  // Add remaining text
  result += text.slice(lastEnd);

  return result;
}

/**
 * Extract all unique pubkeys mentioned in text
 */
export function extractMentionedPubkeys(text: string): string[] {
  const refs = findReferences(text);
  const pubkeys = new Set<string>();

  for (const ref of refs) {
    if (ref.type === 'mention') {
      pubkeys.add(ref.id);
    }
  }

  return Array.from(pubkeys);
}

/**
 * Extract all unique event ids referenced in text
 */
export function extractReferencedEvents(text: string): string[] {
  const refs = findReferences(text);
  const eventIds = new Set<string>();

  for (const ref of refs) {
    if (ref.type === 'note' || ref.type === 'event') {
      eventIds.add(ref.id);
    }
  }

  return Array.from(eventIds);
}

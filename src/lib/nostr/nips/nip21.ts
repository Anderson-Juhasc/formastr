/**
 * NIP-21: nostr: URI Scheme
 * https://github.com/nostr-protocol/nips/blob/master/21.md
 *
 * Defines the nostr: URI scheme for referencing nostr entities:
 * - nostr:npub1...
 * - nostr:nprofile1...
 * - nostr:note1...
 * - nostr:nevent1...
 * - nostr:naddr1...
 */

import * as nip19 from './nip19';

// Regex to match nostr: URIs in text
export const NOSTR_URI_REGEX = /nostr:(n(?:pub|profile|event|ote|addr)1[a-z0-9]+)/gi;

// Regex for bare bech32 (without nostr: prefix)
export const BARE_BECH32_REGEX = /(?<![a-z0-9:])(n(?:pub|profile|event|ote|addr)1[a-z0-9]{20,})/gi;

export type NostrURIType = 'npub' | 'nprofile' | 'note' | 'nevent' | 'naddr';

export interface ParsedNostrURI {
  /** Original URI or bech32 string */
  original: string;
  /** The bech32 portion without nostr: prefix */
  bech32: string;
  /** Type of entity */
  type: NostrURIType;
  /** Decoded data */
  data: nip19.DecodeResult['data'];
}

/**
 * Check if a string is a nostr: URI
 */
export function isNostrURI(str: string): boolean {
  return str.toLowerCase().startsWith('nostr:');
}

/**
 * Extract the bech32 portion from a nostr: URI
 */
export function extractBech32(uri: string): string {
  if (isNostrURI(uri)) {
    return uri.slice(6); // Remove "nostr:" prefix
  }
  return uri;
}

/**
 * Parse a nostr: URI or bare bech32 string
 */
export function parseNostrURI(uriOrBech32: string): ParsedNostrURI | null {
  const bech32 = extractBech32(uriOrBech32);

  const decoded = nip19.tryDecode(bech32);
  if (!decoded) return null;

  const validTypes = ['npub', 'nprofile', 'note', 'nevent', 'naddr'];
  if (!validTypes.includes(decoded.type)) return null;

  return {
    original: uriOrBech32,
    bech32,
    type: decoded.type as NostrURIType,
    data: decoded.data,
  };
}

/**
 * Build a nostr: URI from a bech32 string
 */
export function buildNostrURI(bech32: string): string {
  return `nostr:${bech32}`;
}

/**
 * Build a nostr: URI for a pubkey
 */
export function buildPubkeyURI(pubkey: string, relays?: string[]): string {
  const bech32 = relays?.length
    ? nip19.encodeProfile(pubkey, relays)
    : nip19.hexToNpub(pubkey);
  return buildNostrURI(bech32);
}

/**
 * Build a nostr: URI for an event
 */
export function buildEventURI(eventId: string, relays?: string[], author?: string): string {
  const bech32 = relays?.length || author
    ? nip19.encodeEvent(eventId, relays, author)
    : nip19.hexToNote(eventId);
  return buildNostrURI(bech32);
}

/**
 * Find all nostr: URIs in a text string
 */
export function findNostrURIs(text: string): ParsedNostrURI[] {
  const results: ParsedNostrURI[] = [];
  const seen = new Set<string>();

  // Reset regex
  NOSTR_URI_REGEX.lastIndex = 0;

  let match;
  while ((match = NOSTR_URI_REGEX.exec(text)) !== null) {
    const bech32 = match[1];
    if (seen.has(bech32)) continue;
    seen.add(bech32);

    const parsed = parseNostrURI(bech32);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Find all bare bech32 strings in text (without nostr: prefix)
 */
export function findBareBech32(text: string): ParsedNostrURI[] {
  const results: ParsedNostrURI[] = [];
  const seen = new Set<string>();

  // Reset regex
  BARE_BECH32_REGEX.lastIndex = 0;

  let match;
  while ((match = BARE_BECH32_REGEX.exec(text)) !== null) {
    const bech32 = match[1];
    if (seen.has(bech32)) continue;
    seen.add(bech32);

    const parsed = parseNostrURI(bech32);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Check if parsed URI is a profile reference (npub or nprofile)
 */
export function isProfileURI(parsed: ParsedNostrURI): boolean {
  return parsed.type === 'npub' || parsed.type === 'nprofile';
}

/**
 * Check if parsed URI is an event reference (note, nevent, or naddr)
 */
export function isEventURI(parsed: ParsedNostrURI): boolean {
  return parsed.type === 'note' || parsed.type === 'nevent' || parsed.type === 'naddr';
}

/**
 * Get pubkey from a profile URI
 */
export function getPubkeyFromURI(parsed: ParsedNostrURI): string | null {
  if (parsed.type === 'npub') {
    return parsed.data as string;
  }
  if (parsed.type === 'nprofile') {
    return (parsed.data as nip19.ProfilePointer).pubkey;
  }
  return null;
}

/**
 * Get event id from an event URI
 */
export function getEventIdFromURI(parsed: ParsedNostrURI): string | null {
  if (parsed.type === 'note') {
    return parsed.data as string;
  }
  if (parsed.type === 'nevent') {
    return (parsed.data as nip19.EventPointer).id;
  }
  return null;
}

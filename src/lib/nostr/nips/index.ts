/**
 * Nostr Implementation Possibilities (NIPs)
 *
 * This module provides implementations for various NIPs used in this application:
 *
 * - NIP-05: DNS-based verification (user@domain.com -> pubkey)
 * - NIP-10: Reply threading conventions
 * - NIP-19: Bech32 entity encoding (npub, note, nprofile, nevent, naddr)
 * - NIP-21: nostr: URI scheme
 * - NIP-27: Text note references
 * - NIP-65: Relay list metadata
 * - NIP-92: Media attachments (imeta tags)
 */

export * as nip05 from './nip05';
export * as nip10 from './nip10';
export * as nip19 from './nip19';
export * as nip21 from './nip21';
export * as nip27 from './nip27';
export * as nip65 from './nip65';
export * as nip92 from './nip92';

// Re-export commonly used functions for convenience
export {
  npubToHex,
  hexToNpub,
  noteToHex,
  hexToNote,
  isValidHex,
  isNpub,
  isNprofile,
  isNote,
  isNevent,
  isNaddr,
  decode,
  tryDecode,
  extractPubkey,
  extractEventId,
} from './nip19';

export {
  isNIP05Identifier,
  queryProfile as queryNIP05,
  formatForDisplay as formatNIP05,
} from './nip05';

export {
  getReplyToId,
  getRootId,
  isReply,
  isRootPost,
  getMentionedPubkeys,
} from './nip10';

export {
  isNostrURI,
  parseNostrURI,
  buildNostrURI,
  findNostrURIs,
} from './nip21';

export {
  DEFAULT_RELAYS,
  BOOTSTRAP_RELAYS,
  RELAY_LIST_KIND,
  parseRelayList,
  normalizeRelayUrl,
} from './nip65';

export {
  parseImetaTag,
  parseImetaTags,
  getImetaForUrl,
  hasImetaTags,
} from './nip92';
export type { ImetaData } from './nip92';

/**
 * NIP-10: Reply Threading
 * https://github.com/nostr-protocol/nips/blob/master/10.md
 *
 * Defines conventions for threading replies using 'e' and 'p' tags:
 * - 'e' tags reference other events
 * - Markers: 'root', 'reply', 'mention'
 * - Unmarked tags use positional interpretation (deprecated)
 */

export interface ThreadReference {
  /** The event being replied to */
  replyTo: string | null;
  /** The root event of the thread */
  root: string | null;
  /** Events mentioned but not replied to */
  mentions: string[];
}

/**
 * Parse thread references from event tags
 * Follows NIP-10 conventions for 'e' tags
 */
export function parseThreadReferences(tags: string[][]): ThreadReference {
  const eTags: Array<{ id: string; relay?: string; marker?: string }> = [];

  for (const tag of tags) {
    if (tag[0] === 'e' && tag[1]) {
      eTags.push({
        id: tag[1],
        relay: tag[2] || undefined,
        marker: tag[3] || undefined,
      });
    }
  }

  // If no e tags, this is not a reply
  if (eTags.length === 0) {
    return { replyTo: null, root: null, mentions: [] };
  }

  // Check for marked tags first (preferred method)
  const markedRoot = eTags.find((e) => e.marker === 'root');
  const markedReply = eTags.find((e) => e.marker === 'reply');
  const markedMentions = eTags.filter((e) => e.marker === 'mention').map((e) => e.id);

  if (markedRoot || markedReply) {
    return {
      replyTo: markedReply?.id || markedRoot?.id || null,
      root: markedRoot?.id || null,
      mentions: markedMentions,
    };
  }

  // Fallback to positional interpretation (deprecated but still used)
  // First e tag = root, last e tag = reply, middle = mentions
  if (eTags.length === 1) {
    // Single e tag is both root and reply target
    return {
      replyTo: eTags[0].id,
      root: eTags[0].id,
      mentions: [],
    };
  }

  // Multiple unmarked e tags
  return {
    replyTo: eTags[eTags.length - 1].id,
    root: eTags[0].id,
    mentions: eTags.slice(1, -1).map((e) => e.id),
  };
}

/**
 * Get the event ID this note is replying to
 * Simplified version that just returns the reply target
 */
export function getReplyToId(tags: string[][]): string | null {
  const refs = parseThreadReferences(tags);
  return refs.replyTo;
}

/**
 * Get the root event ID of the thread
 */
export function getRootId(tags: string[][]): string | null {
  const refs = parseThreadReferences(tags);
  return refs.root;
}

/**
 * Check if this event is a reply (has any e tags)
 */
export function isReply(tags: string[][]): boolean {
  return tags.some((tag) => tag[0] === 'e' && tag[1]);
}

/**
 * Check if this event is a root post (no e tags)
 */
export function isRootPost(tags: string[][]): boolean {
  return !isReply(tags);
}

/**
 * Get all pubkeys mentioned in p tags
 */
export function getMentionedPubkeys(tags: string[][]): string[] {
  const pubkeys: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    if (tag[0] === 'p' && tag[1] && !seen.has(tag[1])) {
      seen.add(tag[1]);
      pubkeys.push(tag[1]);
    }
  }

  return pubkeys;
}

/**
 * Build reply tags for a new reply event
 * Follows NIP-10 marked tag conventions
 */
export function buildReplyTags(
  replyToId: string,
  replyToAuthor: string,
  rootId?: string,
  additionalPTags?: string[]
): string[][] {
  const tags: string[][] = [];

  // Root tag (if replying to a non-root post)
  if (rootId && rootId !== replyToId) {
    tags.push(['e', rootId, '', 'root']);
  }

  // Reply tag
  tags.push(['e', replyToId, '', rootId && rootId !== replyToId ? 'reply' : 'root']);

  // P tag for reply author
  tags.push(['p', replyToAuthor]);

  // Additional p tags
  if (additionalPTags) {
    for (const pubkey of additionalPTags) {
      if (pubkey !== replyToAuthor) {
        tags.push(['p', pubkey]);
      }
    }
  }

  return tags;
}

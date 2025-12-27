import { NDKEvent, NDKSubscription, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk';
import { Note } from '@/types/nostr';
import { ensureConnected, safeSubscribe } from './index';

function eventToNote(event: NDKEvent): Note {
  return {
    id: event.id,
    pubkey: event.pubkey,
    content: event.content,
    createdAt: event.created_at || 0,
    tags: event.tags,
    sig: event.sig || '',
  };
}

/**
 * Fetch notes with streaming callback - NON-BLOCKING
 * Uses PARALLEL to get both cache and network results
 */
export function fetchNotesStreaming(
  pubkey: string,
  limit: number,
  onNote: (note: Note) => void,
  onComplete: () => void
): { cancel: () => void } {
  // Validate input - empty pubkey would cause "No filters to merge" error
  if (!pubkey || typeof pubkey !== 'string' || pubkey.length === 0) {
    onComplete();
    return { cancel: () => {} };
  }

  const seen = new Set<string>();
  let eoseReceived = false;
  let sub: NDKSubscription | null = null;
  let cancelled = false;

  // Start subscription after ensuring connection
  ensureConnected().then(() => {
    if (cancelled) return;

    sub = safeSubscribe(
      { kinds: [1], authors: [pubkey], limit },
      {
        closeOnEose: false,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );

    if (!sub) {
      onComplete();
      return;
    }

    sub.on('event', (event: NDKEvent) => {
      if (!seen.has(event.id)) {
        seen.add(event.id);
        const note = eventToNote(event);
        onNote(note);
      }
    });

    sub.on('eose', () => {
      if (!eoseReceived) {
        eoseReceived = true;
        setTimeout(() => {
          sub?.stop();
          onComplete();
        }, 1500);
      }
    });
  }).catch(() => {
    onComplete(); // Complete on error
  });

  return {
    cancel: () => {
      cancelled = true;
      sub?.stop();
    },
  };
}

/**
 * Fetch notes (Promise-based)
 */
export async function fetchNotes(pubkey: string, limit = 20): Promise<Note[]> {
  // Validate input
  if (!pubkey || typeof pubkey !== 'string' || pubkey.length === 0) {
    return [];
  }

  return new Promise((resolve) => {
    const notes: Note[] = [];

    const { cancel } = fetchNotesStreaming(
      pubkey,
      limit,
      (note) => notes.push(note),
      () => {
        cancel();
        notes.sort((a, b) => b.createdAt - a.createdAt);
        resolve(notes);
      }
    );
  });
}

/**
 * Fetch a single note by ID with streaming
 */
export function fetchNoteStreaming(
  noteId: string,
  onNote: (note: Note) => void,
  onComplete: () => void,
  relayHints?: string[]
): { cancel: () => void } {
  // Validate input - empty noteId would cause "No filters to merge" error
  if (!noteId || typeof noteId !== 'string' || noteId.length === 0) {
    onComplete();
    return { cancel: () => {} };
  }

  let found = false;
  let eoseReceived = false;
  let sub: NDKSubscription | null = null;
  let cancelled = false;

  ensureConnected().then(() => {
    if (cancelled) return;

    sub = safeSubscribe(
      { ids: [noteId], limit: 1 },
      {
        closeOnEose: false,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );

    if (!sub) {
      onComplete();
      return;
    }

    sub.on('event', (event: NDKEvent) => {
      if (!found && event.id === noteId) {
        found = true;
        const note = eventToNote(event);
        onNote(note);
        sub?.stop();
        onComplete();
      }
    });

    sub.on('eose', () => {
      if (!eoseReceived) {
        eoseReceived = true;
        if (!found) {
          setTimeout(() => {
            sub?.stop();
            onComplete();
          }, 2000);
        }
      }
    });
  }).catch(() => {
    onComplete();
  });

  return {
    cancel: () => {
      cancelled = true;
      sub?.stop();
    },
  };
}

/**
 * Fetch a single note by ID (Promise-based)
 */
export async function fetchNote(noteId: string): Promise<Note | null> {
  // Validate input
  if (!noteId || typeof noteId !== 'string' || noteId.length === 0) {
    return null;
  }

  return new Promise((resolve) => {
    let note: Note | null = null;

    const { cancel } = fetchNoteStreaming(
      noteId,
      (n) => {
        note = n;
      },
      () => {
        cancel();
        resolve(note);
      }
    );
  });
}

/**
 * Fetch replies to a note with streaming - NON-BLOCKING
 */
export function fetchRepliesStreaming(
  noteId: string,
  limit: number,
  onReply: (note: Note) => void,
  onComplete: () => void
): { cancel: () => void } {
  // Validate input - empty noteId would cause "No filters to merge" error
  if (!noteId || typeof noteId !== 'string' || noteId.length === 0) {
    onComplete();
    return { cancel: () => {} };
  }

  const seen = new Set<string>();
  let eoseReceived = false;
  let sub: NDKSubscription | null = null;
  let cancelled = false;

  ensureConnected().then(() => {
    if (cancelled) return;

    sub = safeSubscribe(
      { kinds: [1], '#e': [noteId], limit },
      {
        closeOnEose: false,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );

    if (!sub) {
      onComplete();
      return;
    }

    sub.on('event', (event: NDKEvent) => {
      const eTags = event.tags.filter((t) => t[0] === 'e');
      const isReply = eTags.some((t) => t[1] === noteId);

      if (isReply && !seen.has(event.id)) {
        seen.add(event.id);
        onReply(eventToNote(event));
      }
    });

    sub.on('eose', () => {
      if (!eoseReceived) {
        eoseReceived = true;
        setTimeout(() => {
          sub?.stop();
          onComplete();
        }, 1500);
      }
    });
  }).catch(() => {
    onComplete();
  });

  return {
    cancel: () => {
      cancelled = true;
      sub?.stop();
    },
  };
}

/**
 * Fetch replies (Promise-based)
 */
export async function fetchReplies(noteId: string, limit = 50): Promise<Note[]> {
  // Validate input
  if (!noteId || typeof noteId !== 'string' || noteId.length === 0) {
    return [];
  }

  return new Promise((resolve) => {
    const notes: Note[] = [];

    const { cancel } = fetchRepliesStreaming(
      noteId,
      limit,
      (note) => notes.push(note),
      () => {
        cancel();
        notes.sort((a, b) => a.createdAt - b.createdAt);
        resolve(notes);
      }
    );
  });
}

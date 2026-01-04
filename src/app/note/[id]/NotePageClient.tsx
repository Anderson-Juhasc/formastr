'use client';

import { useState, useEffect, useRef } from 'react';
import { Note, Profile } from '@/types/nostr';
import { fetchNoteStreaming } from '@/lib/ndk/notes';
import { fetchProfileStreaming } from '@/lib/ndk/profiles';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { NoteContent } from '@/components/notes/NoteContent';
import { NoteStatsBar } from '@/components/notes/NoteStats';
import { LazyReplyList } from '@/components/lazy';
import { NoteSkeleton } from '@/components/ui/Skeleton';
import { useNoteStats } from '@/hooks/useNoteStats';
import { useReplies } from '@/hooks/useReplies';
import { formatNpub } from '@/lib/utils';
import { hexToNpub } from '@/lib/nostr/keys';
import { getReplyToId } from '@/lib/nostr/content';
import { nip19 } from 'nostr-tools';
import Link from 'next/link';

// Fast first content timeout
const FIRST_CONTENT_TIMEOUT = 2000;

interface NotePageClientProps {
  noteId: string;
}

export function NotePageClient({ noteId }: NotePageClientProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hexId, setHexId] = useState<string>('');
  const loadingRef = useRef(true);

  const { stats, loading: statsLoading } = useNoteStats(hexId, !!hexId);
  const { replies, loading: repliesLoading } = useReplies(hexId, !!hexId);

  useEffect(() => {
    let cancelled = false;
    let cancelNote: (() => void) | null = null;
    let cancelProfile: (() => void) | null = null;
    let fastTimeout: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      setLoading(true);
      loadingRef.current = true;
      setError(null);
      setNote(null);
      setAuthor(null);

      try {
        let id = noteId;

        // Strip nostr: prefix if present
        let identifier = noteId;
        if (identifier.startsWith('nostr:')) {
          identifier = identifier.slice(6);
        }

        // Decode based on prefix
        if (identifier.startsWith('note1')) {
          const decoded = nip19.decode(identifier);
          if (decoded.type === 'note') {
            id = decoded.data;
          }
        } else if (identifier.startsWith('nevent1')) {
          const decoded = nip19.decode(identifier);
          if (decoded.type === 'nevent') {
            id = decoded.data.id;
          }
        } else if (identifier.startsWith('naddr1')) {
          const decoded = nip19.decode(identifier);
          if (decoded.type === 'naddr') {
            setError('Addressable events (naddr) are not yet supported');
            setLoading(false);
            loadingRef.current = false;
            return;
          }
        } else if (/^[a-f0-9]{64}$/i.test(identifier)) {
          id = identifier;
        }

        setHexId(id);

        // Fast first content: hide loading after timeout
        fastTimeout = setTimeout(() => {
          if (loadingRef.current && !cancelled) {
            loadingRef.current = false;
            setLoading(false);
          }
        }, FIRST_CONTENT_TIMEOUT);

        // Fetch note with streaming - shows immediately when first event arrives
        let noteFound = false;
        const noteSub = fetchNoteStreaming(
          id,
          (noteData) => {
            if (cancelled || noteFound) return;
            noteFound = true;

            // Show note immediately
            setNote(noteData);

            // Fast first content: hide loading when note arrives
            if (loadingRef.current) {
              loadingRef.current = false;
              setLoading(false);
            }

            // Fetch profile in background (non-blocking)
            const profileSub = fetchProfileStreaming(
              noteData.pubkey,
              (profileData) => {
                if (!cancelled) {
                  setAuthor(profileData);
                }
              },
              () => {} // Don't care about completion
            );
            cancelProfile = profileSub.cancel;
          },
          () => {
            // EOSE - if no note found, show error
            if (!cancelled && !noteFound) {
              setError('Note not found');
              setLoading(false);
              loadingRef.current = false;
            }
          }
        );
        cancelNote = noteSub.cancel;

      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load note');
          setLoading(false);
          loadingRef.current = false;
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      if (fastTimeout) clearTimeout(fastTimeout);
      cancelNote?.();
      cancelProfile?.();
    };
  }, [noteId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <NoteSkeleton />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
        <p className="text-muted-foreground">{error || 'Note not found'}</p>
        <Link
          href="/"
          className="inline-block mt-4 text-primary hover:underline"
        >
          Go back home
        </Link>
      </div>
    );
  }

  const npub = hexToNpub(note.pubkey);
  const displayName = author?.displayName || author?.name || formatNpub(npub);
  const replyToId = getReplyToId(note.tags);
  const createdDate = new Date(note.createdAt * 1000);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Reply indicator */}
      {replyToId && (
        <Link
          href={`/note/${nip19.noteEncode(replyToId)}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
          <span>View parent note</span>
        </Link>
      )}

      <Card>
        {/* Author */}
        <Link href={`/${npub}`} className="flex items-center gap-3 mb-4">
          <Avatar src={author?.picture} alt={displayName} size="lg" />
          <div>
            <p className="font-bold text-lg text-card-foreground">
              {displayName}
            </p>
            {author?.nip05 && (
              <p className="text-primary text-sm font-semibold">
                {author.nip05}
              </p>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="text-lg text-card-foreground mb-4">
          <NoteContent content={note.content} tags={note.tags} />
        </div>

        {/* Timestamp */}
        <div className="pt-4 border-t-2 border-border">
          <time className="text-muted-foreground">
            {createdDate.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            at{' '}
            {createdDate.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </div>

        {/* Stats */}
        <NoteStatsBar stats={stats} loading={statsLoading} />
      </Card>

      {/* Comments */}
      <LazyReplyList replies={replies} loading={repliesLoading} />

      {/* Note ID info */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          <span className="font-semibold">Note ID:</span>{' '}
          <code className="bg-card px-1.5 py-0.5 rounded text-xs text-card-foreground border-2 border-border shadow-sm">
            {nip19.noteEncode(note.id)}
          </code>
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Note, Profile } from '@/types/nostr';
import { fetchNoteStreaming } from '@/lib/ndk/notes';
import { fetchProfileStreaming } from '@/lib/ndk/profiles';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNpub, formatTimestamp } from '@/lib/utils';
import { hexToNpub } from '@/lib/nostr/keys';
import { nip19 } from 'nostr-tools';
import Link from 'next/link';

const EmbeddedNoteContent = dynamic(
  () => import('./EmbeddedNoteContent').then((mod) => mod.EmbeddedNoteContent),
  {
    ssr: false,
    loading: () => <Skeleton className="h-4 w-full" />,
  }
);

const MAX_EMBED_DEPTH = 2;

interface EmbeddedNoteProps {
  noteId: string;
  depth?: number;
}

export function EmbeddedNote({ noteId, depth = 0 }: EmbeddedNoteProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const noteReceivedRef = useRef(false);

  if (depth >= MAX_EMBED_DEPTH) {
    return (
      <div className="my-2 border-2 border-border rounded-lg p-3 text-muted-foreground text-sm font-medium bg-card shadow-sm">
        <Link href={`/note/${noteId}`} className="hover:underline hover:text-primary">
          View nested note →
        </Link>
      </div>
    );
  }

  const decoded = useMemo(() => {
    try {
      if (noteId.startsWith('note1')) {
        const result = nip19.decode(noteId);
        if (result.type === 'note') {
          return { type: 'note' as const, hexId: result.data, relayHints: undefined };
        }
      } else if (noteId.startsWith('nevent1')) {
        const result = nip19.decode(noteId);
        if (result.type === 'nevent') {
          return {
            type: 'nevent' as const,
            hexId: result.data.id,
            relayHints: result.data.relays,
          };
        }
      } else if (noteId.startsWith('naddr1')) {
        const result = nip19.decode(noteId);
        if (result.type === 'naddr') {
          return {
            type: 'naddr' as const,
            kind: result.data.kind,
            pubkey: result.data.pubkey,
            identifier: result.data.identifier,
            relayHints: result.data.relays,
          };
        }
      } else if (/^[0-9a-f]{64}$/i.test(noteId)) {
        return { type: 'hex' as const, hexId: noteId, relayHints: undefined };
      }
      return { type: 'invalid' as const };
    } catch {
      return { type: 'invalid' as const };
    }
  }, [noteId]);

  if (decoded.type === 'naddr') {
    return (
      <div className="my-2 border-2 border-border rounded-lg p-3 text-muted-foreground text-sm font-medium bg-card shadow-sm">
        <Link href={`/note/${noteId}`} className="hover:underline hover:text-primary">
          View referenced content →
        </Link>
      </div>
    );
  }

  if (decoded.type === 'invalid') {
    return (
      <div className="my-2 border-2 border-border rounded-lg p-3 text-muted-foreground text-sm font-medium bg-card shadow-sm">
        Invalid note reference
      </div>
    );
  }

  const hexId = decoded.hexId;
  const relayHints = decoded.relayHints;

  useEffect(() => {
    if (!hexId || hexId.length === 0) {
      setError(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let cancelProfile: (() => void) | null = null;
    noteReceivedRef.current = false;

    const { cancel: cancelNote } = fetchNoteStreaming(
      hexId,
      (noteData) => {
        if (!cancelled) {
          noteReceivedRef.current = true;
          setNote(noteData);
          setLoading(false);

          const { cancel } = fetchProfileStreaming(
            noteData.pubkey,
            (profile) => {
              if (!cancelled) setAuthor(profile);
            },
            () => {}
          );
          cancelProfile = cancel;
        }
      },
      () => {
        if (!cancelled && !noteReceivedRef.current) {
          setError(true);
          setLoading(false);
        }
      },
      relayHints
    );

    return () => {
      cancelled = true;
      cancelNote();
      cancelProfile?.();
    };
  }, [hexId, relayHints]);

  if (loading) {
    return (
      <div className="my-2 border-2 border-border rounded-lg p-3 bg-card shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mt-1" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="my-2 border-2 border-border rounded-lg p-3 text-muted-foreground text-sm font-medium bg-card shadow-sm">
        Could not load referenced note
      </div>
    );
  }

  const npub = hexToNpub(note.pubkey);
  const displayName = author?.displayName || author?.name || formatNpub(npub);
  const noteLink = `/note/${nip19.noteEncode(note.id)}`;

  return (
    <div className="my-2 border-2 border-border rounded-lg p-3 bg-card shadow-md hover:shadow-lg transition-all">
      <Link href={`/${npub}`} className="flex items-center gap-2 mb-2">
        <Avatar src={author?.picture} alt={displayName} size="xs" />
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-card-foreground hover:underline">
            {displayName}
          </span>
          <span className="text-muted-foreground text-xs">
            {formatTimestamp(note.createdAt)}
          </span>
        </div>
      </Link>
      <Link href={noteLink} className="block">
        <div className="text-sm text-card-foreground">
          <EmbeddedNoteContent content={note.content} tags={note.tags} />
        </div>
      </Link>
    </div>
  );
}

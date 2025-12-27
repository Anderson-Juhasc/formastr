'use client';

import { Note, Profile } from '@/types/nostr';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { NoteContent } from './NoteContent';
import { NoteStatsBar } from './NoteStats';
import { useNoteStats } from '@/hooks/useNoteStats';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { formatTimestamp, formatNpub } from '@/lib/utils';
import { hexToNpub } from '@/lib/nostr/keys';
import { getReplyToId } from '@/lib/nostr/content';
import { nip19 } from 'nostr-tools';
import Link from 'next/link';

interface NoteCardProps {
  note: Note;
  author?: Profile;
  showAuthor?: boolean;
  showStats?: boolean;
}

export function NoteCard({ note, author, showAuthor = true, showStats = true }: NoteCardProps) {
  const npub = hexToNpub(note.pubkey);
  const displayName = author?.displayName || author?.name || formatNpub(npub);
  const noteId = nip19.noteEncode(note.id);
  const replyToId = getReplyToId(note.tags);

  // Lazy load stats - only fetch when card is visible
  const { ref: statsRef, isVisible } = useIntersectionObserver({
    rootMargin: '200px', // Start loading when 200px away from viewport
    triggerOnce: true,
  });
  const { stats, loading: statsLoading } = useNoteStats(note.id, showStats && isVisible);

  return (
    <Card ref={statsRef} className="hover:shadow-lg transition-all">
      {/* Reply indicator */}
      {replyToId && (
        <Link
          href={`/note/${nip19.noteEncode(replyToId)}`}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-2 hover:text-primary font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
          <span>Replying to a note</span>
        </Link>
      )}

      {/* Author header */}
      {showAuthor && (
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/${npub}`}>
            <Avatar src={author?.picture} alt={displayName} size="sm" />
          </Link>
          <div className="flex flex-col min-w-0">
            <Link
              href={`/${npub}`}
              className="font-semibold text-card-foreground hover:underline truncate"
            >
              {displayName}
            </Link>
            <Link
              href={`/note/${noteId}`}
              className="text-sm text-muted-foreground hover:underline"
              title={new Date(note.createdAt * 1000).toLocaleString()}
            >
              {formatTimestamp(note.createdAt)}
            </Link>
          </div>
        </div>
      )}

      <div className={!showAuthor ? 'flex gap-3' : ''}>
        {!showAuthor && (
          <Link href={`/${npub}`} className="flex-shrink-0">
            <Avatar src={author?.picture} alt={displayName} size="sm" />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          {!showAuthor && (
            <div className="flex flex-col mb-2">
              <Link
                href={`/${npub}`}
                className="font-semibold text-card-foreground hover:underline"
              >
                {displayName}
              </Link>
              <Link
                href={`/note/${noteId}`}
                className="text-sm text-muted-foreground hover:underline"
                title={new Date(note.createdAt * 1000).toLocaleString()}
              >
                {formatTimestamp(note.createdAt)}
              </Link>
            </div>
          )}
          <div className="text-card-foreground">
            <NoteContent content={note.content} tags={note.tags} />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {showStats && <NoteStatsBar stats={stats} loading={statsLoading} />}
    </Card>
  );
}

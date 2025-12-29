'use client';

import { useMemo, useState } from 'react';
import { ReplyWithAuthor } from '@/hooks/useReplies';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { NoteContent } from './NoteContent';
import { formatNpub, formatTimestamp } from '@/lib/utils';
import { hexToNpub } from '@/lib/nostr/keys';
import { nip19 } from 'nostr-tools';
import Link from 'next/link';

// Limit initial render to prevent mobile memory issues
const INITIAL_RENDER_LIMIT = 15;
const LOAD_MORE_COUNT = 10;

interface ReplyListProps {
  replies: ReplyWithAuthor[];
  loading: boolean;
}

export function ReplyList({ replies, loading }: ReplyListProps) {
  const [displayCount, setDisplayCount] = useState(INITIAL_RENDER_LIMIT);

  // Limit rendered replies to prevent DOM overload
  const displayedReplies = useMemo(() => {
    return replies.slice(0, displayCount);
  }, [replies, displayCount]);

  const hasMore = replies.length > displayCount;

  const loadMore = () => {
    setDisplayCount((prev) => Math.min(prev + LOAD_MORE_COUNT, replies.length));
  };
  if (loading && replies.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Comments
        </h2>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Comments
        </h2>
        <p className="text-center py-8 text-muted-foreground">
          No comments yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Comments ({replies.length})
      </h2>
      {displayedReplies.map(({ note, author }) => {
        const npub = hexToNpub(note.pubkey);
        const displayName = author?.displayName || author?.name || formatNpub(npub);

        return (
          <Card key={note.id} className="flex gap-3">
            <Link href={`/${npub}`} className="flex-shrink-0">
              <Avatar
                src={author?.picture}
                alt={displayName}
                size="sm"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col">
                <Link
                  href={`/${npub}`}
                  className="font-medium text-card-foreground hover:underline"
                >
                  {displayName}
                </Link>
                <Link
                  href={`/note/${nip19.noteEncode(note.id)}`}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  {formatTimestamp(note.createdAt)}
                </Link>
              </div>
              <div className="mt-2 text-card-foreground">
                <NoteContent content={note.content} tags={note.tags} />
              </div>
            </div>
          </Card>
        );
      })}
      {hasMore && !loading && (
        <div className="text-center pt-2">
          <Button onClick={loadMore} variant="secondary" size="sm">
            Load more comments ({replies.length - displayCount} remaining)
          </Button>
        </div>
      )}
      {loading && (
        <Card className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </Card>
      )}
    </div>
  );
}

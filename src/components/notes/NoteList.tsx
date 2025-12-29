'use client';

import { useMemo, useState } from 'react';
import { Note, Profile } from '@/types/nostr';
import { NoteCard } from './NoteCard';
import { NoteSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

// Limit initial render to prevent mobile memory issues
const INITIAL_RENDER_LIMIT = 20;
const LOAD_MORE_COUNT = 10;

interface NoteListProps {
  notes: Note[];
  author?: Profile;
  loading?: boolean;
  showAuthor?: boolean;
}

export function NoteList({ notes, author, loading, showAuthor = true }: NoteListProps) {
  const [displayCount, setDisplayCount] = useState(INITIAL_RENDER_LIMIT);

  // Limit rendered notes to prevent DOM overload
  const displayedNotes = useMemo(() => {
    return notes.slice(0, displayCount);
  }, [notes, displayCount]);

  const hasMore = notes.length > displayCount;

  const loadMore = () => {
    setDisplayCount((prev) => Math.min(prev + LOAD_MORE_COUNT, notes.length));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <NoteSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No notes found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedNotes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          author={author}
          showAuthor={showAuthor}
        />
      ))}
      {hasMore && (
        <div className="text-center pt-4">
          <Button onClick={loadMore} variant="secondary">
            Load more ({notes.length - displayCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

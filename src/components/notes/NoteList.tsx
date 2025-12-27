'use client';

import { Note, Profile } from '@/types/nostr';
import { NoteCard } from './NoteCard';
import { NoteSkeleton } from '@/components/ui/Skeleton';

interface NoteListProps {
  notes: Note[];
  author?: Profile;
  loading?: boolean;
  showAuthor?: boolean;
}

export function NoteList({ notes, author, loading, showAuthor = true }: NoteListProps) {
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
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          author={author}
          showAuthor={showAuthor}
        />
      ))}
    </div>
  );
}

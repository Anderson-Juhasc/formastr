'use client';

import { useProfile } from '@/hooks/useProfile';
import { useNotes } from '@/hooks/useNotes';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { NoteList } from '@/components/notes/NoteList';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

interface ProfilePageClientProps {
  identifier: string;
}

export function ProfilePageClient({ identifier }: ProfilePageClientProps) {
  const { profile, pubkey, loading: profileLoading, error: profileError } = useProfile(identifier);
  const { notes, loading: notesLoading } = useNotes(pubkey, 20);

  if (profileError) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
        <p className="text-muted-foreground">{profileError}</p>
        <Link
          href="/"
          className="inline-block mt-4 text-primary hover:underline"
        >
          Go back home
        </Link>
      </div>
    );
  }

  if (profileLoading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-foreground mb-4">Profile Not Found</h1>
        <Link
          href="/"
          className="inline-block text-primary hover:underline"
        >
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ProfileHeader profile={profile} />
      <ProfileTabs identifier={identifier} />
      <NoteList
        notes={notes}
        author={profile}
        loading={notesLoading}
        showAuthor={false}
      />
    </div>
  );
}

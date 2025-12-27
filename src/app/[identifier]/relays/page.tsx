'use client';

import { useParams } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useRelays } from '@/hooks/useRelays';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { RelayListDisplay } from '@/components/profile/RelayListDisplay';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

export default function RelaysPage() {
  const params = useParams();
  const identifier = decodeURIComponent(params.identifier as string);

  const { profile, pubkey, loading: profileLoading, error: profileError } = useProfile(identifier);
  const { relays, loading: relaysLoading, isDefault } = useRelays(pubkey);

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
      <RelayListDisplay
        relays={relays}
        loading={relaysLoading}
        isDefault={isDefault}
      />
    </div>
  );
}

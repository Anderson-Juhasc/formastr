'use client';

import { useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNpub } from '@/lib/utils';
import { hexToNpub } from '@/lib/nostr/keys';
import { FollowWithProfile } from '@/hooks/useFollowing';
import Link from 'next/link';

interface FollowingListProps {
  following: FollowWithProfile[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  loadMore?: () => void;
  total?: number;
  emptyMessage?: string;
}

export function FollowingList({
  following,
  loading,
  loadingMore = false,
  hasMore = false,
  loadMore,
  total,
  emptyMessage = 'Not following anyone',
}: FollowingListProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || !loadMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const current = observerRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [hasMore, loadMore, loadingMore]);

  if (!loading && following.length === 0 && (total === undefined || total === 0)) {
    return (
      <div className="text-center py-12 text-muted-foreground font-medium">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      {total !== undefined && total > 0 && (
        <p className="text-sm text-muted-foreground mb-4 font-medium">
          Showing {following.length} of {total}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {loading && following.length === 0 && [...Array(6)].map((_, i) => (
          <Card key={`skeleton-${i}`} className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </Card>
        ))}
        {following.map(({ entry, profile }) => {
          const npub = profile?.npub || hexToNpub(entry.pubkey);
          const displayName = profile?.displayName || profile?.name || entry.petname || formatNpub(npub);

          return (
            <Link key={entry.pubkey} href={`/${npub}`}>
              <Card className="flex items-center gap-3 hover:shadow-lg transition-all">
                <Avatar
                  src={profile?.picture}
                  alt={displayName}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-card-foreground truncate">
                    {displayName}
                  </p>
                  {profile?.nip05 ? (
                    <p className="text-sm text-primary font-semibold truncate">
                      {profile.nip05}
                    </p>
                  ) : !profile ? (
                    <Skeleton className="h-3 w-24 mt-1" />
                  ) : null}
                </div>
              </Card>
            </Link>
          );
        })}
        {loadingMore && (
          <>
            <Card className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </Card>
          </>
        )}
      </div>
      {hasMore && !loadingMore && <div ref={observerRef} className="h-4 mt-4" />}
    </div>
  );
}

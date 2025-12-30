'use client';

import Link from 'next/link';
import { useProfileCache } from '@/hooks/useProfileCache';

interface MentionLinkProps {
  pubkey: string;
  href: string;
  fallback: string;
}

export function MentionLink({ pubkey, href, fallback }: MentionLinkProps) {
  const { profile } = useProfileCache(pubkey);
  const displayName = profile?.displayName || profile?.name
    ? '@' + (profile.displayName || profile.name)
    : fallback;

  return (
    <Link
      href={href}
      className="text-violet-600 dark:text-violet-400 hover:underline"
    >
      {displayName}
    </Link>
  );
}

interface MentionSpanProps {
  pubkey: string;
  href: string;
  fallback: string;
}

export function MentionSpan({ pubkey, href, fallback }: MentionSpanProps) {
  const { profile } = useProfileCache(pubkey);
  const displayName = profile?.displayName || profile?.name
    ? '@' + (profile.displayName || profile.name)
    : fallback;

  return (
    <span
      className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = href;
      }}
    >
      {displayName}
    </span>
  );
}

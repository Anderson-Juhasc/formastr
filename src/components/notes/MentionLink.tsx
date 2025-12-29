'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchProfileStreaming } from '@/lib/ndk/profiles';

interface MentionLinkProps {
  pubkey: string;
  href: string;
  fallback: string;
}

export function MentionLink({ pubkey, href, fallback }: MentionLinkProps) {
  const [displayName, setDisplayName] = useState<string>(fallback);

  useEffect(() => {
    if (!pubkey || pubkey.length === 0) {
      return;
    }

    const { cancel } = fetchProfileStreaming(
      pubkey,
      (profile) => {
        const name = profile.displayName || profile.name;
        if (name) {
          setDisplayName('@' + name);
        }
      },
      () => {} // onComplete
    );

    return cancel;
  }, [pubkey]);

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
  const [displayName, setDisplayName] = useState<string>(fallback);

  useEffect(() => {
    if (!pubkey || pubkey.length === 0) {
      return;
    }

    const { cancel } = fetchProfileStreaming(
      pubkey,
      (profile) => {
        const name = profile.displayName || profile.name;
        if (name) {
          setDisplayName('@' + name);
        }
      },
      () => {} // onComplete
    );

    return cancel;
  }, [pubkey]);

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

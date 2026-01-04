import { Metadata } from 'next';
import { nip19 } from 'nostr-tools';
import { ProfilePageClient } from './ProfilePageClient';
import {
  resolveIdentifierForMetadata,
  fetchProfileMetadata,
  formatDisplayName,
  truncateText,
  SITE_URL,
  SITE_NAME,
} from '@/lib/metadata';

// Cache metadata for 12 hours - reduces serverless function calls
export const revalidate = 43200;

interface PageProps {
  params: Promise<{ identifier: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { identifier } = await params;
  const decodedIdentifier = decodeURIComponent(identifier);

  try {
    // Resolve identifier to pubkey
    const resolved = await resolveIdentifierForMetadata(decodedIdentifier);

    if (!resolved) {
      return {
        title: 'Profile Not Found',
        description: 'The requested Nostr profile could not be found.',
      };
    }

    const { pubkey, relays } = resolved;
    const npub = nip19.npubEncode(pubkey);

    // Fetch profile metadata
    const profile = await fetchProfileMetadata(pubkey, relays);
    const displayName = formatDisplayName(profile, npub);
    const description = profile?.about
      ? truncateText(profile.about, 160)
      : `View ${displayName}'s Nostr profile, notes, and connections on Formastr.`;

    const pageUrl = `${SITE_URL}/${encodeURIComponent(decodedIdentifier)}`;

    return {
      title: displayName,
      description,
      openGraph: {
        type: 'profile',
        url: pageUrl,
        title: `${displayName} | ${SITE_NAME}`,
        description,
        images: profile?.picture
          ? [
              {
                url: profile.picture,
                alt: `${displayName}'s profile picture`,
              },
            ]
          : undefined,
      },
      twitter: {
        card: profile?.picture ? 'summary_large_image' : 'summary',
        title: `${displayName} | ${SITE_NAME}`,
        description,
        images: profile?.picture ? [profile.picture] : undefined,
      },
      alternates: {
        canonical: pageUrl,
      },
      other: {
        'profile:username': profile?.name || npub,
      },
    };
  } catch {
    // Fallback metadata on error
    return {
      title: 'Nostr Profile',
      description: 'View this Nostr profile on Formastr.',
    };
  }
}

export default async function ProfilePage({ params }: PageProps) {
  const { identifier } = await params;
  const decodedIdentifier = decodeURIComponent(identifier);

  return <ProfilePageClient identifier={decodedIdentifier} />;
}

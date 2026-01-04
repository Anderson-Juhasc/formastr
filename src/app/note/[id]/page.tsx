import { Metadata } from 'next';
import { nip19 } from 'nostr-tools';
import { NotePageClient } from './NotePageClient';
import {
  decodeNoteId,
  fetchNoteMetadata,
  fetchProfileMetadata,
  formatDisplayName,
  truncateText,
  SITE_URL,
  SITE_NAME,
} from '@/lib/metadata';

// Cache metadata for 12 hours - reduces serverless function calls
export const revalidate = 43200;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    // Decode note identifier
    const decoded = decodeNoteId(id);

    if (!decoded) {
      return {
        title: 'Note Not Found',
        description: 'The requested Nostr note could not be found.',
      };
    }

    const { id: hexId, relays } = decoded;

    // Fetch note metadata
    const note = await fetchNoteMetadata(hexId, relays);

    if (!note) {
      return {
        title: 'Note',
        description: 'View this Nostr note on Formastr.',
      };
    }

    // Fetch author profile for richer metadata
    const author = await fetchProfileMetadata(note.pubkey, relays);
    const authorName = formatDisplayName(author, nip19.npubEncode(note.pubkey));

    // Create description from note content
    const contentPreview = truncateText(
      note.content.replace(/\n+/g, ' ').trim(),
      160
    );
    const description = contentPreview || `A note by ${authorName} on Nostr.`;

    // Create title from content or author
    const titlePreview = truncateText(note.content.replace(/\n+/g, ' ').trim(), 60);
    const title = titlePreview || `Note by ${authorName}`;

    const noteId = nip19.noteEncode(hexId);
    const pageUrl = `${SITE_URL}/note/${noteId}`;

    return {
      title,
      description,
      openGraph: {
        type: 'article',
        url: pageUrl,
        title: `${title} | ${SITE_NAME}`,
        description,
        images: author?.picture
          ? [
              {
                url: author.picture,
                alt: `${authorName}'s profile picture`,
              },
            ]
          : undefined,
        publishedTime: new Date(note.createdAt * 1000).toISOString(),
        authors: [authorName],
      },
      twitter: {
        card: 'summary',
        title: `${title} | ${SITE_NAME}`,
        description,
        images: author?.picture ? [author.picture] : undefined,
      },
      alternates: {
        canonical: pageUrl,
      },
      other: {
        'article:author': authorName,
        'article:published_time': new Date(note.createdAt * 1000).toISOString(),
      },
    };
  } catch {
    // Fallback metadata on error
    return {
      title: 'Note',
      description: 'View this Nostr note on Formastr.',
    };
  }
}

export default async function NotePage({ params }: PageProps) {
  const { id } = await params;
  return <NotePageClient noteId={id} />;
}

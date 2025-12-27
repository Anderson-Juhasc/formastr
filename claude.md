# Formastr

Nostr profile viewer. Built with Next.js 16 (App Router).

## Tech Stack

- Next.js 16.1.1 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS 4
- `@nostr-dev-kit/ndk` - Relay management
- `@nostr-dev-kit/ndk-cache-dexie` - IndexedDB caching
- `@tanstack/react-query` - Data fetching
- `nostr-tools` - Key encoding, NIP implementations
- `@snort/system` - Content parsing
- `date-fns` - Date formatting
- `next-themes` - Dark mode
- `react-markdown` + `remark-gfm` - Markdown rendering
- `qrcode.react` - QR code generation

## Features

- View profiles by npub, hex pubkey, nprofile, or NIP-05
- Browse user notes with rich content rendering
- View follower/following lists
- View user relay lists (NIP-65)
- Note stats (replies, reposts, likes, zaps)
- Embedded notes, images, videos, YouTube
- Image gallery with modal viewer
- QR code modal for profiles
- Markdown rendering in profile about
- Dark/light mode toggle

## Project Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      # Homepage with search
│   ├── [identifier]/
│   │   ├── page.tsx                  # Profile page
│   │   ├── following/page.tsx
│   │   ├── followers/page.tsx
│   │   └── relays/page.tsx           # User relay list
│   └── note/[id]/page.tsx            # Single note view
├── components/
│   ├── ui/
│   │   ├── Avatar.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── ImageModal.tsx
│   │   ├── Input.tsx
│   │   ├── Markdown.tsx
│   │   ├── QRModal.tsx
│   │   ├── Skeleton.tsx
│   │   └── ThemeToggle.tsx
│   ├── notes/
│   │   ├── EmbeddedNote.tsx
│   │   ├── EmbeddedNoteContent.tsx
│   │   ├── ImageGallery.tsx
│   │   ├── LinkPreview.tsx
│   │   ├── MentionLink.tsx
│   │   ├── NoteCard.tsx
│   │   ├── NoteContent.tsx
│   │   ├── NoteList.tsx
│   │   ├── NoteStats.tsx
│   │   ├── ReplyList.tsx
│   │   └── YouTubeEmbed.tsx
│   ├── profile/
│   │   ├── FollowingList.tsx
│   │   ├── ProfileAbout.tsx
│   │   ├── ProfileHeader.tsx
│   │   ├── ProfileTabs.tsx
│   │   └── RelayListDisplay.tsx
│   ├── CacheInitializer.tsx
│   ├── HeaderSearch.tsx
│   ├── NDKProvider.tsx
│   ├── QueryProvider.tsx
│   ├── SearchBar.tsx
│   └── ThemeProvider.tsx
├── hooks/
│   ├── useFollowers.ts
│   ├── useFollowing.ts
│   ├── useIntersectionObserver.ts
│   ├── useNotes.ts
│   ├── useNoteStats.ts
│   ├── useProfile.ts
│   ├── useRelays.ts
│   └── useReplies.ts
├── lib/
│   ├── ndk/
│   │   ├── index.ts                  # NDK singleton, connection
│   │   ├── cleanup.ts
│   │   ├── follows.ts
│   │   ├── notes.ts
│   │   ├── profiles.ts
│   │   ├── relays.ts
│   │   └── stats.ts
│   ├── nostr/
│   │   ├── content.ts                # Content parsing via @snort/system
│   │   ├── keys.ts                   # Identifier resolution
│   │   ├── relays.ts                 # Re-exports from nip65
│   │   └── nips/
│   │       ├── index.ts              # NIP exports
│   │       ├── nip05.ts              # DNS verification
│   │       ├── nip10.ts              # Reply threading
│   │       ├── nip19.ts              # Bech32 encoding
│   │       ├── nip21.ts              # nostr: URI scheme
│   │       ├── nip27.ts              # Text note references
│   │       ├── nip65.ts              # Relay list metadata
│   │       └── nip92.ts              # Media attachments (imeta)
│   └── utils.ts                      # cn() utility
└── types/
    └── nostr.ts                      # Profile, Note, RelayList
```

## URL Routes

- `/` - Homepage with search
- `/{identifier}` - Profile (npub, hex, nprofile, or NIP-05)
- `/{identifier}/following` - Following list
- `/{identifier}/followers` - Followers list
- `/{identifier}/relays` - User's relay list
- `/note/{id}` - Single note view

## Relays

```typescript
// Default relays for data fetching
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.primal.net',
];

// Bootstrap relays for NIP-65 discovery
const BOOTSTRAP_RELAYS = [
  'wss://purplepag.es',
  'wss://relay.damus.io',
];
```

## Supported NIPs

| NIP | Description |
|-----|-------------|
| NIP-05 | DNS-based verification (user@domain.com) |
| NIP-10 | Reply threading conventions |
| NIP-19 | Bech32 encoding (npub, note, nprofile, nevent, naddr) |
| NIP-21 | nostr: URI scheme |
| NIP-27 | Text note references |
| NIP-65 | Relay list metadata (kind 10002) |
| NIP-92 | Media attachments (imeta tags) |

## Supported Event Kinds

- Kind 0: Profile metadata
- Kind 1: Notes
- Kind 3: Contact list (following)
- Kind 6: Reposts
- Kind 7: Reactions
- Kind 9735: Zap receipts
- Kind 10002: Relay list (NIP-65)

## Types

```typescript
interface Profile {
  pubkey: string;
  npub: string;
  name?: string;
  displayName?: string;
  picture?: string;
  banner?: string;
  about?: string;
  nip05?: string;
  nip05valid?: boolean;
  lud16?: string;
  website?: string;
}

interface Note {
  id: string;
  pubkey: string;
  content: string;
  createdAt: number;
  tags: string[][];
  sig: string;
}

interface RelayList {
  read: string[];
  write: string[];
  all: string[];
}
```

## Conventions

- Client Components for all interactive elements
- Mobile-first responsive design
- Purple accent color (#9333ea)
- All data fetching via hooks with loading/error states
- IndexedDB caching via NDK Dexie adapter
- Streaming data fetches with timeouts to prevent infinite loading

### Rules:
1. **Never overwrite working code** - If code is already working, do not touch it when editing other parts
2. **Checkpoint awareness** - Before any edit, mentally verify: "Am I about to undo a fix I just made?"
3. **Minimal edits** - Only modify the specific lines needed; do not rewrite surrounding working code
4. **Final review** - Before presenting final code, compare against your successful intermediate states

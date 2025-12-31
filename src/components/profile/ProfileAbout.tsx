'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import Link from 'next/link';
import { MentionLink } from '@/components/notes/MentionLink';
import { TextWithEmoji } from '@/components/ui/TextWithEmoji';
import { useMemo } from 'react';
import * as nip19 from '@/lib/nostr/nips/nip19';

interface ProfileAboutProps {
  about: string;
  emojiTags?: string[][];
}

// Regex to find nostr: URIs and bare bech32 identifiers
const NOSTR_PATTERN = /(?:nostr:)?(npub1[a-z0-9]{58}|nprofile1[a-z0-9]+|note1[a-z0-9]{58}|nevent1[a-z0-9]+|naddr1[a-z0-9]+)/g;

interface TextSegment {
  type: 'text' | 'mention' | 'note';
  content: string;
  pubkey?: string;
  noteId?: string;
  href?: string;
}

function parseNostrReferences(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  // Reset regex
  NOSTR_PATTERN.lastIndex = 0;

  let match;
  while ((match = NOSTR_PATTERN.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const bech32 = match[1];
    const decoded = nip19.tryDecode(bech32);

    if (decoded) {
      // Profile references
      if (decoded.type === 'npub') {
        segments.push({
          type: 'mention',
          content: bech32,
          pubkey: decoded.data,
          href: `/${bech32}`,
        });
      } else if (decoded.type === 'nprofile') {
        segments.push({
          type: 'mention',
          content: bech32,
          pubkey: decoded.data.pubkey,
          href: `/${bech32}`,
        });
      }
      // Event references
      else if (decoded.type === 'note' || decoded.type === 'nevent' || decoded.type === 'naddr') {
        segments.push({
          type: 'note',
          content: bech32,
          noteId: bech32,
          href: `/note/${bech32}`,
        });
      } else {
        segments.push({ type: 'text', content: match[0] });
      }
    } else {
      segments.push({ type: 'text', content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

// Custom text renderer that handles nostr references and emojis
function TextWithNostrRefs({ children, emojiTags }: { children: string; emojiTags?: string[][] }) {
  const segments = useMemo(() => parseNostrReferences(children), [children]);

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === 'mention' && segment.pubkey) {
          return (
            <MentionLink
              key={i}
              pubkey={segment.pubkey}
              href={segment.href || '/'}
              fallback={`@${segment.content.slice(0, 12)}...`}
            />
          );
        }
        if (segment.type === 'note' && segment.noteId) {
          return (
            <Link
              key={i}
              href={segment.href || '#'}
              className="text-primary hover:underline"
            >
              {segment.content.slice(0, 16)}...
            </Link>
          );
        }
        // Render text with emoji support
        return <TextWithEmoji key={i} text={segment.content} emojiTags={emojiTags} />;
      })}
    </>
  );
}

// Create markdown components with emoji support
function createMarkdownComponents(emojiTags?: string[][]): Components {
  const processChildren = (child: React.ReactNode, index: number): React.ReactNode => {
    if (typeof child === 'string') {
      return <TextWithNostrRefs key={index} emojiTags={emojiTags}>{child}</TextWithNostrRefs>;
    }
    return child;
  };

  return {
    // Override text nodes to handle nostr references and emojis
    p: ({ children }) => (
      <p className="mb-2 last:mb-0">
        {Array.isArray(children) ? children.map((child, i) => processChildren(child, i)) : processChildren(children, 0)}
      </p>
    ),

    // Headings
    h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,

    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline break-all"
      >
        {children}
      </a>
    ),

    // Lists
    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="ml-2">{children}</li>,

    // Code
    code: ({ className, children }) => {
      const isBlock = className?.includes('language-');
      if (isBlock) {
        return (
          <code className="block bg-muted text-foreground p-3 rounded-lg text-sm font-mono overflow-x-auto mb-2">
            {children}
          </code>
        );
      }
      return (
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    },
    pre: ({ children }) => <pre className="mb-2">{children}</pre>,

    // Blockquote
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground mb-2">
        {children}
      </blockquote>
    ),

    // Styling
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,

    // Images
    img: ({ src, alt }) => (
      <img
        src={src}
        alt={alt || ''}
        className="max-w-full h-auto max-h-64 rounded-lg my-2"
        loading="lazy"
      />
    ),

    // Horizontal rule
    hr: () => <hr className="border-border my-4" />,
  };
}

export function ProfileAbout({ about, emojiTags }: ProfileAboutProps) {
  const components = useMemo(() => createMarkdownComponents(emojiTags), [emojiTags]);

  return (
    <div className="text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {about}
      </ReactMarkdown>
    </div>
  );
}

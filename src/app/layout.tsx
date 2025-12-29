import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { CacheInitializer } from '@/components/CacheInitializer';
import { QueryProvider } from '@/components/QueryProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ProfileSearchInput } from '@/components/ProfileSearchInput';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://formastr.app';
const SITE_NAME = 'Formastr';
const SITE_DESCRIPTION = 'View Nostr profiles, notes, and relay lists. Search by npub, nprofile, hex pubkey, or NIP-05 identifier. Fast, decentralized social media explorer.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - Nostr Profile Viewer`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'Nostr',
    'profile viewer',
    'npub',
    'nprofile',
    'NIP-05',
    'decentralized',
    'social media',
    'relay',
    'notes',
    'Bitcoin',
    'Lightning',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_NAME,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Nostr Profile Viewer`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: `${SITE_NAME} Logo`,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: `${SITE_NAME} - Nostr Profile Viewer`,
    description: SITE_DESCRIPTION,
    images: ['/icons/icon-512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: 'technology',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#030712' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: 'SocialNetworkingApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'View Nostr profiles',
    'Browse user notes',
    'View follower and following lists',
    'View relay configurations',
    'NIP-05 verification support',
    'Dark and light mode',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} bg-card text-foreground min-h-screen`}>
        <ThemeProvider>
          <QueryProvider>
            <CacheInitializer />
            <header className="border-b-2 border-border bg-card shadow-md" role="banner">
              <nav className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4" aria-label="Main navigation">
                <Link
                  href="/"
                  className="text-xl font-bold text-primary hover:text-primary/80 transition-colors shrink-0"
                  aria-label="Formastr - Home"
                >
                  Formastr
                </Link>
                <ProfileSearchInput />
                <ThemeToggle />
              </nav>
            </header>
            <main className="pt-8 pb-16 bg-background" role="main">
              <div className="max-w-4xl mx-auto px-4">
                <PageErrorBoundary>
                  {children}
                </PageErrorBoundary>
              </div>
            </main>
            <footer className="border-t-2 border-border bg-card" role="contentinfo">
              <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
                <p>{SITE_NAME} - Decentralized Nostr Profile Viewer</p>
              </div>
            </footer>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

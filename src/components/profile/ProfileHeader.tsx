'use client';

import { useState, useEffect, useMemo } from 'react';
import { Profile } from '@/types/nostr';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { QRModal } from '@/components/ui/QRModal';
import { ImageModal } from '@/components/ui/ImageModal';
import { TextWithEmoji } from '@/components/ui/TextWithEmoji';
import { ProfileAbout } from './ProfileAbout';
import { formatNpub } from '@/lib/utils';
import { fetchRelayList } from '@/lib/ndk/relays';
import { nip19 } from 'nostr-tools';
import Image from 'next/image';

interface ProfileHeaderProps {
  profile: Profile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const [showQR, setShowQR] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [showOpenMenu, setShowOpenMenu] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [writeRelays, setWriteRelays] = useState<string[]>([]);
  const displayName = profile.displayName || profile.name || formatNpub(profile.npub);

  useEffect(() => {
    fetchRelayList(profile.pubkey).then((relayList) => {
      if (relayList?.write.length) {
        setWriteRelays(relayList.write.slice(0, 5));
      }
    });
  }, [profile.pubkey]);

  const nprofile = useMemo(() => {
    return nip19.nprofileEncode({
      pubkey: profile.pubkey,
      relays: writeRelays.length > 0 ? writeRelays : undefined,
    });
  }, [profile.pubkey, writeRelays]);

  const qrTabs = useMemo(() => [
    { label: 'npub', value: profile.npub },
    { label: 'hex', value: profile.pubkey },
    { label: 'nprofile', value: nprofile },
  ], [profile.npub, profile.pubkey, nprofile]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setShowCopyMenu(false);
    setToast(`${label} copied`);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="relative">
      <div
        className={`relative h-32 md:h-48 bg-gradient-to-br from-primary via-primary/80 to-purple-400 dark:to-purple-600 rounded-2xl overflow-hidden ${profile.banner && !bannerError && profile.banner.startsWith('https://') ? 'cursor-pointer' : ''}`}
        onClick={profile.banner && !bannerError && profile.banner.startsWith('https://') ? () => setShowBanner(true) : undefined}
      >
        {profile.banner && !bannerError && profile.banner.startsWith('https://') && (
          <Image
            src={profile.banner}
            alt="Banner"
            fill
            sizes="100vw"
            className="object-cover hover:opacity-90 transition-opacity"
            onError={() => setBannerError(true)}
            priority={false}
            loading="eager"
          />
        )}
      </div>

      <div className="relative z-10 px-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-16">
          <Avatar
            src={profile.picture}
            alt={displayName}
            size="xl"
            className="border-4 border-card"
            onClick={profile.picture ? () => setShowAvatar(true) : undefined}
          />
          <div className="flex-1 pb-2">
            <h1 className="text-2xl font-bold text-foreground">
              <TextWithEmoji text={displayName} emojiTags={profile.emojiTags} />
            </h1>
            {profile.nip05 && (
              <p className="text-primary font-semibold flex items-center gap-1">
                {profile.nip05valid && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {profile.nip05}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.lud16 && (
              <a href={`lightning:${profile.lud16}`}>
                <Button variant="primary" size="sm">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  Zap
                </Button>
              </a>
            )}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCopyMenu(!showCopyMenu)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
              {showCopyMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowCopyMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-36 bg-card border border-border/60 rounded-xl shadow-[var(--shadow-lg)] z-20 py-1 overflow-hidden">
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                      onClick={() => copyToClipboard(profile.npub, 'npub')}
                    >
                      npub
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                      onClick={() => copyToClipboard(profile.pubkey, 'hex')}
                    >
                      hex
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                      onClick={() => copyToClipboard(nprofile, 'nprofile')}
                    >
                      nprofile
                    </button>
                  </div>
                </>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowQR(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </Button>
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOpenMenu(!showOpenMenu)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
              {showOpenMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowOpenMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-36 bg-card border border-border/60 rounded-xl shadow-[var(--shadow-lg)] z-20 py-1 overflow-hidden">
                    <a
                      href={`web+nostr:${nprofile}`}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                      onClick={() => setShowOpenMenu(false)}
                    >
                      Web app
                    </a>
                    <a
                      href={`nostr:${nprofile}`}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                      onClick={() => setShowOpenMenu(false)}
                    >
                      App
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {profile.about && (
          <div className="mt-4 text-card-foreground">
            <ProfileAbout about={profile.about} emojiTags={profile.emojiTags} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground font-medium">
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary underline decoration-border hover:decoration-primary transition-colors"
            >
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {profile.lud16 && (
            <span className="flex items-center gap-1 min-w-0">
              <span className="flex-shrink-0">&#9889;</span>
              <span className="truncate">{profile.lud16}</span>
            </span>
          )}
        </div>
      </div>

      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        tabs={qrTabs}
        title={displayName}
      />

      {profile.banner && !bannerError && (
        <ImageModal
          isOpen={showBanner}
          onClose={() => setShowBanner(false)}
          images={[profile.banner]}
          alt="Banner"
        />
      )}

      {profile.picture && (
        <ImageModal
          isOpen={showAvatar}
          onClose={() => setShowAvatar(false)}
          images={[profile.picture]}
          alt={displayName}
        />
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-[var(--shadow-xl)] text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  );
}

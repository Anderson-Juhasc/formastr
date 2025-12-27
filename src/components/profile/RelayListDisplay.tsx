'use client';

import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelayList } from '@/lib/nostr/nips/nip65';

interface RelayListDisplayProps {
  relays: RelayList | null;
  loading: boolean;
  isDefault: boolean;
}

function RelayIcon({ read, write }: { read: boolean; write: boolean }) {
  if (read && write) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
        read/write
      </span>
    );
  }
  if (read) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
        read
      </span>
    );
  }
  if (write) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">
        write
      </span>
    );
  }
  return null;
}

export function RelayListDisplay({ relays, loading, isDefault }: RelayListDisplayProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (!relays || relays.all.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground font-medium">
        No relays found
      </div>
    );
  }

  // Build a list with read/write status for each relay
  const relayStatus = relays.all.map((url) => ({
    url,
    read: relays.read.includes(url),
    write: relays.write.includes(url),
  }));

  return (
    <div>
      {isDefault && (
        <div className="mb-4 px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
          No NIP-65 relay list found. Showing default relays.
        </div>
      )}
      <p className="text-sm text-muted-foreground mb-4 font-medium">
        {relays.all.length} relay{relays.all.length !== 1 ? 's' : ''}
      </p>
      <div className="space-y-3">
        {relayStatus.map(({ url, read, write }) => (
          <Card key={url} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <span className="font-mono text-sm text-card-foreground truncate">
                {url.replace(/^wss?:\/\//, '')}
              </span>
            </div>
            <RelayIcon read={read} write={write} />
          </Card>
        ))}
      </div>
    </div>
  );
}

'use client';

import { NoteStats, formatZapAmount } from '@/lib/ndk/stats';

interface NoteStatsProps {
  stats: NoteStats | null;
  loading?: boolean;
}

export function NoteStatsBar({ stats, loading }: NoteStatsProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-6 pt-3 mt-3 border-t-2 border-border">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 w-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex items-center gap-6 pt-3 mt-3 border-t-2 border-border text-sm text-muted-foreground font-medium">
      {/* Replies */}
      <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span>{stats.replies}</span>
      </div>

      {/* Reposts */}
      <div className="flex items-center gap-1.5 hover:text-success transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>{stats.reposts}</span>
      </div>

      {/* Likes */}
      <div className="flex items-center gap-1.5 hover:text-destructive transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <span>{stats.likes}</span>
      </div>

      {/* Zaps */}
      <div className="flex items-center gap-1.5 hover:text-warning transition-colors">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
        </svg>
        <span>
          {stats.zapsAmount > 0 ? formatZapAmount(stats.zapsAmount) : stats.zaps}
        </span>
      </div>
    </div>
  );
}

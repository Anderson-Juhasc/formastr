import { SearchBar } from '@/components/SearchBar';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10">
      <div className="text-center space-y-4">
        <img src="/icons/icon.svg" alt="Formastr logo" width={80} height={80} className="mx-auto rounded-xl" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          <span className="gradient-text">Formastr</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Search Nostr users by name or find profiles by npub, NIP-05, and more
        </p>
      </div>
      <SearchBar />
      <div className="text-sm text-muted-foreground space-y-3 text-center">
        <p className="font-medium text-foreground/80">Search by:</p>
        <ul className="flex flex-wrap justify-center gap-2">
          <li>
            <code className="bg-muted/50 px-3 py-1.5 rounded-lg text-foreground/80 text-xs font-medium">
              username or display name
            </code>
          </li>
          <li>
            <code className="bg-muted/50 px-3 py-1.5 rounded-lg text-foreground/80 text-xs font-medium">
              npub1... or nprofile1...
            </code>
          </li>
          <li>
            <code className="bg-muted/50 px-3 py-1.5 rounded-lg text-foreground/80 text-xs font-medium">
              user@domain.com
            </code>
          </li>
        </ul>
      </div>
    </div>
  );
}

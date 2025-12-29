import { SearchBar } from '@/components/SearchBar';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          Formastr
        </h1>
        <p className="text-lg text-muted-foreground max-w-md font-medium">
          Search Nostr users by name or find profiles by npub, NIP-05, and more
        </p>
      </div>
      <SearchBar />
      <div className="text-sm text-muted-foreground space-y-1 text-center">
        <p className="font-semibold text-foreground">Search by:</p>
        <ul className="space-y-1">
          <li>
            <code className="bg-card px-2 py-0.5 rounded text-card-foreground border-2 border-border shadow-sm">
              username or display name
            </code>
          </li>
          <li>
            <code className="bg-card px-2 py-0.5 rounded text-card-foreground border-2 border-border shadow-sm">
              npub1... or nprofile1...
            </code>
          </li>
          <li>
            <code className="bg-card px-2 py-0.5 rounded text-card-foreground border-2 border-border shadow-sm">
              user@domain.com
            </code>
          </li>
        </ul>
      </div>
    </div>
  );
}

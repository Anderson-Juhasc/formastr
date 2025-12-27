'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function isValidIdentifier(input: string): boolean {
  if (input.startsWith('npub1') || input.startsWith('nprofile1')) {
    return input.length > 10;
  }
  if (input.includes('@') || input.includes('.')) {
    return true;
  }
  if (/^[0-9a-f]{64}$/i.test(input)) {
    return true;
  }
  return false;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    if (!isValidIdentifier(trimmed)) {
      setError('Enter a valid npub, nprofile, NIP-05, or hex pubkey');
      return;
    }

    setError(null);
    router.push(`/${encodeURIComponent(trimmed)}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (error) setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex gap-2">
        <Input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="npub, nprofile, pubkey, or user@domain.com"
          className={`flex-1 ${error ? 'border-destructive' : ''}`}
        />
        <Button type="submit">Search</Button>
      </div>
      {error && (
        <p className="mt-1 text-sm text-destructive font-medium">{error}</p>
      )}
    </form>
  );
}

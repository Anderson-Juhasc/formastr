export interface Profile {
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
  emojiTags?: string[][]; // NIP-30 custom emoji tags
}

export interface Note {
  id: string;
  pubkey: string;
  content: string;
  createdAt: number;
  tags: string[][];
  sig: string;
}

export interface RelayList {
  read: string[];
  write: string[];
}

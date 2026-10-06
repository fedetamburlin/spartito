import type { SongSettings } from './settings';

export interface SharedDocument {
  source: string;
  settings?: Partial<SongSettings>;
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function readDocumentFromHash(hash: string): SharedDocument | null {
  if (!hash.startsWith('#doc=')) return null;
  try {
    const parsed = JSON.parse(decodeBase64Url(hash.slice(5))) as Partial<SharedDocument>;
    if (typeof parsed.source !== 'string') return null;
    return { source: parsed.source, settings: parsed.settings };
  } catch {
    return null;
  }
}

export function clearDocumentHash(): void {
  history.replaceState(null, '', location.pathname + location.search);
}

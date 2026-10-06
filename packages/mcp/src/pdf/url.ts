import type { AppState } from '../deps';

export function encodeDocument(state: AppState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
}

export function renderUrl(appUrl: string, state: AppState): string {
  const base = appUrl.replace(/\/+$/, '');
  return `${base}/#doc=${encodeDocument(state)}`;
}

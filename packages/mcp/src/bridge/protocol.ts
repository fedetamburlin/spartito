import type { SongSettings } from '../../../../src/core/settings';

export const PROTOCOL_VERSION = 1;

export interface HelloMessage {
  type: 'hello';
  app: string;
  version: number;
}

export interface StateMessage {
  type: 'state';
  source: string;
  settings: SongSettings;
}

export interface ResponseMessage {
  type: 'response';
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface PongMessage {
  type: 'pong';
}

export type ClientMessage = HelloMessage | StateMessage | ResponseMessage | PongMessage;

export interface WelcomeMessage {
  type: 'welcome';
  version: number;
}

export interface RequestMessage {
  type: 'request';
  id: string;
  method: string;
  params?: unknown;
}

export interface PingMessage {
  type: 'ping';
}

export type ServerMessage = WelcomeMessage | RequestMessage | PingMessage;

export function parseClientMessage(data: string): ClientMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const type = (value as { type?: unknown }).type;
  if (typeof type !== 'string') return null;
  return value as ClientMessage;
}

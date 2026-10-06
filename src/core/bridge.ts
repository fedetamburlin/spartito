import type { SongSettings } from './settings';

export type BridgeStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface BridgeState {
  source: string;
  settings: SongSettings;
}

export interface BridgeHandlers {
  getState(): BridgeState;
  setSource(source: string): void;
  updateSettings(patch: Partial<SongSettings>): SongSettings;
}

export const DEFAULT_BRIDGE_URL = 'ws://127.0.0.1:7331/bridge';

export function createBridge(handlers: BridgeHandlers, url: string = DEFAULT_BRIDGE_URL) {
  let socket: WebSocket | null = null;
  let welcomed = false;
  let status: BridgeStatus = 'disconnected';
  const listeners = new Set<(status: BridgeStatus) => void>();

  function setStatus(next: BridgeStatus): void {
    status = next;
    for (const listener of listeners) listener(next);
  }

  function send(message: unknown): void {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  function respond(id: string, ok: boolean, result?: unknown, error?: string): void {
    send({ type: 'response', id, ok, result, error });
  }

  function handleRequest(id: string, method: string, params: unknown): void {
    try {
      const values = (params ?? {}) as { source?: string; patch?: Partial<SongSettings> };
      if (method === 'get_state') {
        respond(id, true, handlers.getState());
      } else if (method === 'set_source' && typeof values.source === 'string') {
        handlers.setSource(values.source);
        respond(id, true, {});
      } else if (method === 'update_settings') {
        const settings = handlers.updateSettings(values.patch ?? {});
        respond(id, true, { settings });
      } else {
        respond(id, false, undefined, `Unknown method: ${method}`);
      }
    } catch (error) {
      respond(id, false, undefined, error instanceof Error ? error.message : String(error));
    }
  }

  function handleMessage(raw: string): void {
    let message: { type?: string; id?: string; method?: string; params?: unknown };
    try {
      message = JSON.parse(raw) as typeof message;
    } catch {
      return;
    }
    switch (message.type) {
      case 'welcome':
        welcomed = true;
        setStatus('connected');
        send({ type: 'state', ...handlers.getState() });
        break;
      case 'ping':
        send({ type: 'pong' });
        break;
      case 'request':
        if (typeof message.id === 'string' && typeof message.method === 'string') {
          handleRequest(message.id, message.method, message.params);
        }
        break;
    }
  }

  function connect(): void {
    if (socket) return;
    welcomed = false;
    setStatus('connecting');
    const ws = new WebSocket(url);
    socket = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', app: 'spartito-web', version: 1 }));
    ws.onmessage = (event) => handleMessage(String(event.data));
    ws.onclose = () => {
      if (socket === ws) {
        socket = null;
        setStatus(welcomed ? 'disconnected' : 'failed');
      }
    };
    ws.onerror = () => {};
  }

  function disconnect(): void {
    const ws = socket;
    socket = null;
    ws?.close();
    setStatus('disconnected');
  }

  function sendState(state: BridgeState): void {
    send({ type: 'state', ...state });
  }

  function onStatus(listener: (status: BridgeStatus) => void): () => void {
    listeners.add(listener);
    listener(status);
    return () => listeners.delete(listener);
  }

  return { connect, disconnect, sendState, onStatus, status: () => status };
}

export type Bridge = ReturnType<typeof createBridge>;

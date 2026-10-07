import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import { sanitizeSettings, type SongSettings } from '../../../../src/core/settings';
import { APP_NOT_CONNECTED, type AppBridge, type AppState } from '../deps';
import { isAllowedOrigin } from '../transports/origin';
import { PROTOCOL_VERSION, parseClientMessage, type ServerMessage } from './protocol';

const REQUEST_TIMEOUT_MS = 3000;
const PING_INTERVAL_MS = 15_000;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class BridgeServer implements AppBridge {
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly pingTimer: NodeJS.Timeout;
  private app: WebSocket | null = null;
  private state: AppState | null = null;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(
    private readonly originAllowed: (origin: string | undefined) => boolean = isAllowedOrigin
  ) {
    this.pingTimer = setInterval(() => this.ping(), PING_INTERVAL_MS);
    this.pingTimer.unref();
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    if (pathname !== '/bridge') {
      socket.destroy();
      return;
    }
    if (!this.originAllowed(req.headers.origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    this.wss.handleUpgrade(req, socket, head, (ws) => this.accept(ws));
  }

  private accept(ws: WebSocket): void {
    this.app?.close(1000, 'replaced');
    this.app = ws;
    this.state = null;
    ws.on('message', (data) => this.onMessage(String(data)));
    ws.on('close', () => {
      if (this.app === ws) {
        this.app = null;
        this.state = null;
        this.failPending(new Error('Spartito web app disconnected'));
      }
    });
    ws.on('error', () => {});
  }

  private onMessage(data: string): void {
    const message = parseClientMessage(data);
    if (!message) return;
    switch (message.type) {
      case 'hello':
        if (message.version === PROTOCOL_VERSION) {
          this.send({ type: 'welcome', version: PROTOCOL_VERSION });
        } else {
          this.app?.close(1000, 'protocol mismatch');
        }
        break;
      case 'state':
        this.state = { source: message.source, settings: sanitizeSettings(message.settings) };
        break;
      case 'response': {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(message.id);
        if (message.ok) pending.resolve(message.result);
        else pending.reject(new Error(message.error || 'Unknown Spartito web app error'));
        break;
      }
      case 'pong':
        break;
    }
  }

  private ping(): void {
    this.send({ type: 'ping' });
  }

  private send(message: ServerMessage): void {
    if (this.app?.readyState === WebSocket.OPEN) {
      this.app.send(JSON.stringify(message));
    }
  }

  private request(method: string, params?: unknown): Promise<unknown> {
    if (!this.isConnected()) return Promise.reject(new Error(APP_NOT_CONNECTED));
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Spartito web app did not answer "${method}" in time`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.send({ type: 'request', id, method, params });
    });
  }

  private failPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  isConnected(): boolean {
    return this.app?.readyState === WebSocket.OPEN && this.state !== null;
  }

  getState(): AppState {
    if (!this.state) throw new Error(APP_NOT_CONNECTED);
    return this.state;
  }

  async setSource(source: string): Promise<void> {
    await this.request('set_source', { source });
    if (this.state) this.state = { ...this.state, source };
  }

  async updateSettings(patch: Partial<SongSettings>): Promise<SongSettings> {
    const result = (await this.request('update_settings', { patch })) as
      | { settings?: SongSettings }
      | undefined;
    const settings = sanitizeSettings(result?.settings ?? { ...this.state?.settings, ...patch });
    if (this.state) this.state = { ...this.state, settings };
    return settings;
  }

  async close(): Promise<void> {
    clearInterval(this.pingTimer);
    this.failPending(new Error('Bridge closed'));
    this.app?.close(1000, 'shutting down');
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
  }
}

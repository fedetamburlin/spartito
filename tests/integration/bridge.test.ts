import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBridge, type BridgeHandlers } from '../../src/core/bridge';
import { defaultSettings, type SongSettings } from '../../src/core/settings';

/**
 * The bridge only talks to the browser WebSocket API, so a small fake is
 * enough to cover the protocol without network or timers.
 */

class FakeWebSocket {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  /* --- helpers used by the tests --- */
  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  message(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  raw(data: string): void {
    this.onmessage?.({ data });
  }

  sentJson(): unknown[] {
    return this.sent.map((item) => JSON.parse(item));
  }
}

interface Harness {
  bridge: ReturnType<typeof createBridge>;
  socket: () => FakeWebSocket;
  state: { source: string; settings: SongSettings };
  calls: { setSource: string[]; updateSettings: Partial<SongSettings>[] };
}

function setup(overrides: Partial<BridgeHandlers> = {}): Harness {
  const state = { source: '{title: Test}\n[Am]hello', settings: defaultSettings() };
  const calls = { setSource: [] as string[], updateSettings: [] as Partial<SongSettings>[] };
  const handlers: BridgeHandlers = {
    getState: () => state,
    setSource: (source) => {
      calls.setSource.push(source);
      state.source = source;
    },
    updateSettings: (patch) => {
      calls.updateSettings.push(patch);
      state.settings = { ...state.settings, ...patch };
      return state.settings;
    },
    ...overrides
  };
  return {
    bridge: createBridge(handlers),
    socket: () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1],
    state,
    calls
  };
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('bridge connection lifecycle', () => {
  it('reports connecting, then sends hello when the socket opens', () => {
    const { bridge, socket } = setup();
    expect(bridge.status()).toBe('disconnected');

    bridge.connect();
    expect(bridge.status()).toBe('connecting');
    expect(socket().url).toBe('ws://127.0.0.1:7331/bridge');

    socket().open();
    expect(socket().sentJson()).toEqual([{ type: 'hello', app: 'spartito-web', version: 1 }]);
  });

  it('becomes connected on welcome and pushes the current state', () => {
    const { bridge, socket, state } = setup();
    bridge.connect();
    socket().open();
    socket().message({ type: 'welcome' });

    expect(bridge.status()).toBe('connected');
    expect(socket().sentJson().at(-1)).toEqual({ type: 'state', ...state });
  });

  it('reports failed when the socket closes before welcome', () => {
    const { bridge, socket } = setup();
    bridge.connect();
    socket().close();
    expect(bridge.status()).toBe('failed');
  });

  it('reports disconnected when the socket closes after welcome', () => {
    const { bridge, socket } = setup();
    bridge.connect();
    socket().open();
    socket().message({ type: 'welcome' });
    socket().close();
    expect(bridge.status()).toBe('disconnected');
  });

  it('closes the socket and reports disconnected on disconnect()', () => {
    const { bridge, socket } = setup();
    bridge.connect();
    socket().open();
    socket().message({ type: 'welcome' });

    bridge.disconnect();
    expect(socket().readyState).toBe(FakeWebSocket.CLOSED);
    expect(bridge.status()).toBe('disconnected');
  });

  it('does not open a second socket while one is active', () => {
    const { bridge } = setup();
    bridge.connect();
    bridge.connect();
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

describe('bridge protocol', () => {
  it('answers ping with pong', () => {
    const { bridge, socket } = setup();
    bridge.connect();
    socket().open();
    socket().message({ type: 'ping' });
    expect(socket().sentJson().at(-1)).toEqual({ type: 'pong' });
  });

  it('answers get_state with the current document and settings', () => {
    const { bridge, socket, state } = setup();
    bridge.connect();
    socket().open();
    socket().message({ type: 'request', id: 'r1', method: 'get_state' });

    expect(socket().sentJson().at(-1)).toEqual({
      type: 'response',
      id: 'r1',
      ok: true,
      result: state,
      error: undefined
    });
  });

  it('applies set_source and acknowledges it', () => {
    const { bridge, socket, calls } = setup();
    bridge.connect();
    socket().open();
    socket().message({
      type: 'request',
      id: 'r2',
      method: 'set_source',
      params: { source: '[C]new' }
    });

    expect(calls.setSource).toEqual(['[C]new']);
    expect(socket().sentJson().at(-1)).toMatchObject({ type: 'response', id: 'r2', ok: true });
  });

  it('applies update_settings and returns the sanitized settings', () => {
    const { bridge, socket, calls, state } = setup();
    bridge.connect();
    socket().open();
    socket().message({
      type: 'request',
      id: 'r3',
      method: 'update_settings',
      params: { patch: { textPt: 13 } }
    });

    expect(calls.updateSettings).toEqual([{ textPt: 13 }]);
    expect(socket().sentJson().at(-1)).toMatchObject({
      type: 'response',
      id: 'r3',
      ok: true,
      result: { settings: state.settings }
    });
  });

  it('rejects unknown methods', () => {
    const { bridge, socket } = setup();
    bridge.connect();
    socket().open();
    socket().message({ type: 'request', id: 'r4', method: 'nope' });

    expect(socket().sentJson().at(-1)).toMatchObject({
      type: 'response',
      id: 'r4',
      ok: false,
      error: 'Unknown method: nope'
    });
  });

  it('turns handler exceptions into error responses', () => {
    const { bridge, socket } = setup({
      updateSettings: () => {
        throw new Error('broken settings');
      }
    });
    bridge.connect();
    socket().open();
    socket().message({ type: 'request', id: 'r5', method: 'update_settings' });

    expect(socket().sentJson().at(-1)).toMatchObject({
      type: 'response',
      id: 'r5',
      ok: false,
      error: 'broken settings'
    });
  });

  it('ignores malformed JSON without changing the status', () => {
    const { bridge, socket } = setup();
    bridge.connect();
    socket().open();
    socket().message({ type: 'welcome' });
    const before = socket().sent.length;

    socket().raw('not json');

    expect(socket().sent).toHaveLength(before);
    expect(bridge.status()).toBe('connected');
  });

  it('ignores requests without an id or method', () => {
    const { bridge, socket } = setup();
    bridge.connect();
    socket().open();
    const before = socket().sent.length;
    socket().message({ type: 'request', method: 'get_state' });
    socket().message({ type: 'request', id: 'x' });
    expect(socket().sent).toHaveLength(before);
  });

  it('sends state only while the socket is open', () => {
    const { bridge, socket, state } = setup();
    bridge.connect();
    const before = socket().sent.length;
    bridge.sendState(state);
    expect(socket().sent).toHaveLength(before);

    socket().open();
    bridge.sendState(state);
    expect(socket().sentJson().at(-1)).toEqual({ type: 'state', ...state });
  });
});

describe('bridge status listeners', () => {
  it('calls the listener immediately with the current status', () => {
    const { bridge } = setup();
    const seen: string[] = [];
    bridge.onStatus((status) => seen.push(status));
    expect(seen).toEqual(['disconnected']);
  });

  it('notifies every status change and stops after unsubscribe', () => {
    const { bridge, socket } = setup();
    const seen: string[] = [];
    const unsubscribe = bridge.onStatus((status) => seen.push(status));

    bridge.connect();
    socket().open();
    socket().message({ type: 'welcome' });
    expect(seen).toEqual(['disconnected', 'connecting', 'connected']);

    unsubscribe();
    bridge.disconnect();
    expect(seen).toHaveLength(3);
  });
});

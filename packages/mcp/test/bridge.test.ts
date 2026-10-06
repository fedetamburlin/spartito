import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { sanitizeSettings } from '../../../src/core/settings';
import { BridgeServer } from '../src/bridge/server';
import { createServer } from '../src/server';
import { startHttp } from '../src/transports/http';

const ALLOWED_ORIGIN = 'https://fedetamburlin.github.io';

async function startBridge() {
  const bridge = new BridgeServer();
  const handle = await startHttp(
    0,
    () => createServer({ bridge, appUrl: 'https://app.test', outDir: '/tmp/out', version: 'test' }),
    (req, socket, head) => bridge.handleUpgrade(req, socket, head)
  );
  return { bridge, handle, url: `ws://127.0.0.1:${handle.port}/bridge` };
}

async function waitFor(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout waiting for condition');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('websocket bridge', () => {
  it('rejects websockets from unknown origins', async () => {
    const { handle, url } = await startBridge();
    const outcome = await new Promise<string>((resolve, reject) => {
      const ws = new WebSocket(url, { origin: 'https://evil.example' });
      ws.on('open', () => {
        ws.close();
        resolve('open');
      });
      ws.on('unexpected-response', (_request, response) => {
        response.resume();
        resolve(`status:${response.statusCode}`);
      });
      ws.on('error', reject);
    });
    expect(outcome).toBe('status:403');
    await handle.close();
  });

  it('tracks app state and forwards requests', async () => {
    const { bridge, handle, url } = await startBridge();
    const app = new WebSocket(url, { origin: ALLOWED_ORIGIN });
    const messages: Array<Record<string, unknown>> = [];
    app.on('message', (data) => messages.push(JSON.parse(String(data))));

    await once(app, 'open');
    expect(bridge.isConnected()).toBe(false);

    app.send(JSON.stringify({ type: 'hello', app: 'spartito-web', version: 1 }));
    await waitFor(() => messages.some((message) => message.type === 'welcome'));

    app.send(JSON.stringify({ type: 'state', source: '{title: A}\n', settings: {} }));
    await waitFor(() => bridge.isConnected());
    expect(bridge.getState().source).toBe('{title: A}\n');

    const setPromise = bridge.setSource('{title: B}\n');
    await waitFor(() => messages.some((message) => message.method === 'set_source'));
    const setRequest = messages.find((message) => message.method === 'set_source');
    app.send(JSON.stringify({ type: 'response', id: setRequest?.id, ok: true, result: {} }));
    await setPromise;
    expect(bridge.getState().source).toBe('{title: B}\n');

    const updatePromise = bridge.updateSettings({ columns: 2 });
    await waitFor(() => messages.some((message) => message.method === 'update_settings'));
    const updateRequest = messages.find((message) => message.method === 'update_settings');
    app.send(
      JSON.stringify({
        type: 'response',
        id: updateRequest?.id,
        ok: true,
        result: { settings: sanitizeSettings({ columns: 2 }) }
      })
    );
    const settings = await updatePromise;
    expect(settings.columns).toBe(2);
    expect(bridge.getState().settings.columns).toBe(2);

    app.close();
    await waitFor(() => !bridge.isConnected());
    await handle.close();
  });
});

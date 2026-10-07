import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { sanitizeSettings, type SongSettings } from '../../../src/core/settings';
import { APP_NOT_CONNECTED, type AppBridge, type AppState } from '../src/deps';
import { outputPathFor } from '../src/pdf/render';
import { encodeDocument, renderUrl } from '../src/pdf/url';
import { createServer } from '../src/server';

class FakeBridge implements AppBridge {
  lastSource: string | undefined;
  lastPatch: Partial<SongSettings> | undefined;

  constructor(
    public state: AppState = {
      source: '{title: Test Song}\n[Am]Hello [F]world\n',
      settings: sanitizeSettings()
    },
    public connected = true
  ) {}

  isConnected(): boolean {
    return this.connected;
  }

  getState(): AppState {
    if (!this.connected) throw new Error(APP_NOT_CONNECTED);
    return this.state;
  }

  async setSource(source: string): Promise<void> {
    this.lastSource = source;
    this.state = { ...this.state, source };
  }

  async updateSettings(patch: Partial<SongSettings>): Promise<SongSettings> {
    this.lastPatch = patch;
    const settings = sanitizeSettings({ ...this.state.settings, ...patch });
    this.state = { ...this.state, settings };
    return settings;
  }
}

async function connectClient(bridge: AppBridge) {
  const server = createServer({ bridge, appUrl: 'https://app.test', outDir: '/tmp/out', version: 'test' });
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, server };
}

function textOf(result: unknown): string {
  const content = (result as { content?: Array<{ type: string; text: string }> }).content;
  return content?.[0]?.text ?? '';
}

describe('MCP tools', () => {
  it('exposes the four song tools', async () => {
    const { client, server } = await connectClient(new FakeBridge());
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      'export_pdf',
      'get_song',
      'set_song',
      'update_settings'
    ]);
    await client.close();
    await server.close();
  });

  it('get_song returns source, parsed document and settings', async () => {
    const { client, server } = await connectClient(new FakeBridge());
    const result = await client.callTool({ name: 'get_song', arguments: {} });
    const payload = JSON.parse(textOf(result));
    expect(payload.source).toContain('[Am]Hello');
    expect(payload.document.title).toBe('Test Song');
    expect(payload.settings.fontId).toBe('inter');
    await client.close();
    await server.close();
  });

  it('set_song replaces the source', async () => {
    const bridge = new FakeBridge();
    const { client, server } = await connectClient(bridge);
    const result = await client.callTool({
      name: 'set_song',
      arguments: { source: '{title: Other}\n' }
    });
    expect(JSON.parse(textOf(result))).toEqual({ ok: true });
    expect(bridge.lastSource).toBe('{title: Other}\n');
    await client.close();
    await server.close();
  });

  it('update_settings returns sanitized settings', async () => {
    const bridge = new FakeBridge();
    const { client, server } = await connectClient(bridge);
    const result = await client.callTool({
      name: 'update_settings',
      arguments: { patch: { columns: 2, textPt: 999 } }
    });
    const payload = JSON.parse(textOf(result));
    expect(payload.settings.columns).toBe(2);
    expect(payload.settings.textPt).toBe(14);
    expect(bridge.lastPatch).toEqual({ columns: 2, textPt: 999 });
    await client.close();
    await server.close();
  });

  it('explains that the app must be connected', async () => {
    const { client, server } = await connectClient(new FakeBridge(undefined, false));
    const result = await client.callTool({ name: 'get_song', arguments: {} });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('not connected');
    await client.close();
    await server.close();
  });
});

describe('pdf helpers', () => {
  it('builds a #doc= url from source and settings', () => {
    const state: AppState = {
      source: '{title: Song}\n[Am]Text\n',
      settings: sanitizeSettings({ columns: 2 })
    };
    const url = renderUrl('https://app.test/', state);
    expect(url.startsWith('https://app.test/#doc=')).toBe(true);
    const decoded = JSON.parse(Buffer.from(url.split('#doc=')[1], 'base64url').toString('utf8'));
    expect(decoded.source).toBe(state.source);
    expect(decoded.settings.columns).toBe(2);
    expect(encodeDocument(state)).not.toContain('+');
  });

  it('resolves the output path from the song title', () => {
    const output = outputPathFor('/tmp/out', '{title: Perché È Così}\n');
    expect(output).toBe('/tmp/out/perche-e-cosi.pdf');
  });

  it('honors an explicit output path inside the output dir', () => {
    expect(outputPathFor('/tmp/out', '{title: X}\n', 'custom.pdf')).toBe('/tmp/out/custom.pdf');
  });

  it('rejects an explicit output path outside the output dir', () => {
    expect(() => outputPathFor('/tmp/out', '{title: X}\n', '/tmp/custom.pdf')).toThrow(
      '/tmp/out'
    );
    expect(() => outputPathFor('/tmp/out', '{title: X}\n', '../escape.pdf')).toThrow('/tmp/out');
  });
});

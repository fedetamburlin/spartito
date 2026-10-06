import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { sanitizeSettings, type SongSettings } from '../../../src/core/settings';
import type { AppBridge, AppState } from '../src/deps';
import { createServer } from '../src/server';
import { startHttp } from '../src/transports/http';

class FakeBridge implements AppBridge {
  constructor(
    private state: AppState = {
      source: '{title: Http Song}\n[G]Hi\n',
      settings: sanitizeSettings()
    }
  ) {}

  isConnected(): boolean {
    return true;
  }

  getState(): AppState {
    return this.state;
  }

  async setSource(source: string): Promise<void> {
    this.state = { ...this.state, source };
  }

  async updateSettings(patch: Partial<SongSettings>): Promise<SongSettings> {
    const settings = sanitizeSettings({ ...this.state.settings, ...patch });
    this.state = { ...this.state, settings };
    return settings;
  }
}

describe('streamable http transport', () => {
  it('serves MCP over POST /mcp', async () => {
    const bridge = new FakeBridge();
    const handle = await startHttp(
      0,
      () => createServer({ bridge, appUrl: 'https://app.test', outDir: '/tmp/out', version: 'test' }),
      () => {}
    );
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${handle.port}/mcp`)
    );
    const client = new Client({ name: 'http-test', version: '1.0.0' });
    await client.connect(transport);

    const tools = await client.listTools();
    expect(tools.tools).toHaveLength(4);

    const result = await client.callTool({ name: 'get_song', arguments: {} });
    const content = result.content as Array<{ text: string }>;
    const payload = JSON.parse(content[0].text);
    expect(payload.document.title).toBe('Http Song');

    await client.close();
    await handle.close();
  });
});

import './compat';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AppBridge } from './deps';
import { registerLiveTools, type LiveToolOptions } from './tools/live';

export interface ServerOptions extends LiveToolOptions {
  bridge: AppBridge;
  version: string;
}

export function createServer(options: ServerOptions): McpServer {
  const server = new McpServer({ name: 'spartito', version: options.version });
  registerLiveTools(server, options.bridge, options);
  return server;
}

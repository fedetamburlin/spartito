import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export async function startStdio(create: () => McpServer): Promise<void> {
  const server = create();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

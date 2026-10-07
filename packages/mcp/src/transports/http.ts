import '../compat';
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { DEFAULT_APP_URL, isAllowedHost, isAllowedOrigin } from './origin';

export interface HttpTransportHandle {
  server: Server;
  port: number;
  close(): Promise<void>;
}

export async function startHttp(
  port: number,
  create: () => McpServer,
  onUpgrade: (req: IncomingMessage, socket: Duplex, head: Buffer) => void,
  appUrl: string = DEFAULT_APP_URL
): Promise<HttpTransportHandle> {
  const server = createHttpServer((req, res) => {
    void handleRequest(req, res, create, appUrl);
  });
  server.on('upgrade', (req, socket, head) => {
    if (!isAllowedHost(req.headers.host)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    onUpgrade(req, socket, head);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return {
    server,
    port: (server.address() as AddressInfo).port,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      })
  };
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  create: () => McpServer,
  appUrl: string
): Promise<void> {
  if (!isAllowedHost(req.headers.host)) {
    res.writeHead(403, { 'content-type': 'text/plain' }).end('Forbidden');
    return;
  }
  const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
  if (pathname !== '/mcp') {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { 'content-type': 'text/plain', allow: 'POST' }).end('Method not allowed');
    return;
  }
  if (req.headers.origin !== undefined && !isAllowedOrigin(req.headers.origin, appUrl)) {
    res.writeHead(403, { 'content-type': 'text/plain' }).end('Forbidden');
    return;
  }

  const server = create();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  try {
    const body = await readJsonBody(req);
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
          id: null
        })
      );
    }
  } finally {
    await server.close();
  }
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 4 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

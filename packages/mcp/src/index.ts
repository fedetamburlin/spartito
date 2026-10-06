import path from 'node:path';
import { BridgeServer } from './bridge/server';
import { createServer } from './server';
import { startHttp, type HttpTransportHandle } from './transports/http';
import { startStdio } from './transports/stdio';

const VERSION = '0.1.0';

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const serveOnly = process.argv.includes('--serve');
const port = Number(process.env.SPARTITO_BRIDGE_PORT ?? argValue('--port') ?? 7331);
const appUrl = process.env.SPARTITO_APP_URL ?? 'https://fedetamburlin.github.io/spartito';
const outDir = process.env.SPARTITO_OUT_DIR ?? path.resolve(process.cwd(), 'out');

const bridge = new BridgeServer();
const create = () => createServer({ bridge, appUrl, outDir, version: VERSION });

let httpHandle: HttpTransportHandle | undefined;
try {
  httpHandle = await startHttp(port, create, (req, socket, head) =>
    bridge.handleUpgrade(req, socket, head)
  );
  console.error(
    `[spartito-mcp] HTTP MCP: http://127.0.0.1:${httpHandle.port}/mcp · bridge: ws://127.0.0.1:${httpHandle.port}/bridge`
  );
} catch (error) {
  console.error(
    `[spartito-mcp] HTTP/bridge disabled: ${error instanceof Error ? error.message : String(error)}`
  );
}

if (!serveOnly) {
  await startStdio(create);
} else if (!httpHandle) {
  process.exit(1);
}

async function shutdown(): Promise<void> {
  await bridge.close();
  if (httpHandle) await httpHandle.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

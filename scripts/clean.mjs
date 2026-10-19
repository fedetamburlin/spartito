#!/usr/bin/env node
/** Removes generated build/test artifacts. Never touches node_modules. */
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
  'blob-report',
  'packages/mcp/dist'
];

for (const target of targets) {
  rmSync(join(ROOT, target), { recursive: true, force: true });
  console.log(`removed ${target}`);
}

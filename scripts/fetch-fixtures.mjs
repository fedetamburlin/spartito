#!/usr/bin/env node
/**
 * Downloads the real Ultimate Guitar pages listed in
 * tests/fixtures/ug-sources.json into tests/fixtures/local/ug/.
 *
 * These files are copyrighted and must stay local: the folder is
 * gitignored and CI never runs this script. Only URLs and metadata are
 * committed. Use --force to refresh files that already exist.
 *
 * Usage: node scripts/fetch-fixtures.mjs [--force]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = join(ROOT, 'tests/fixtures/ug-sources.json');
const OUT_DIR = join(ROOT, 'tests/fixtures/local/ug');
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0 Safari/537.36';
const DELAY_MS = 800;

const force = process.argv.includes('--force');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** The page embeds a JSON blob in data-content; the tab text sits in wiki_tab. */
function extractTabText(html) {
  const match = /data-content=(["'])([\s\S]*?)\1>/.exec(html);
  if (!match) return null;
  let data;
  try {
    data = JSON.parse(decodeEntities(match[2]));
  } catch {
    return null;
  }
  const direct = data?.store?.page?.data?.tab_view?.wiki_tab;
  if (typeof direct === 'string' && direct.length > 0) return direct;
  return findContent(data);
}

function findContent(node) {
  if (!node || typeof node !== 'object') return null;
  if (typeof node.content === 'string' && node.content.length > 100) return node.content;
  for (const value of Object.values(node)) {
    const found = findContent(value);
    if (found) return found;
  }
  return null;
}

async function fetchOne(source) {
  const response = await fetch(source.url, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html' }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const content = extractTabText(await response.text());
  if (!content) throw new Error('tab content not found in the page');
  writeFileSync(join(OUT_DIR, `${source.slug}.txt`), content, 'utf8');
  return content.length;
}

const sources = JSON.parse(readFileSync(SOURCES, 'utf8'));
mkdirSync(OUT_DIR, { recursive: true });

let saved = 0;
let skipped = 0;
let failed = 0;

for (const source of sources) {
  const target = join(OUT_DIR, `${source.slug}.txt`);
  if (existsSync(target) && !force) {
    skipped += 1;
    console.log(`skip  ${source.slug} (already downloaded)`);
    continue;
  }
  try {
    const length = await fetchOne(source);
    saved += 1;
    console.log(`saved ${source.slug} (${length} chars)`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${source.slug}: ${error.message}`);
  }
  await sleep(DELAY_MS);
}

console.log(`\n${saved} saved, ${skipped} skipped, ${failed} failed.`);
console.log(`Output: ${OUT_DIR}`);
if (failed > 0) process.exitCode = 1;

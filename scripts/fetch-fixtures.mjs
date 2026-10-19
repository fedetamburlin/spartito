#!/usr/bin/env node
/**
 * Downloads the real-world fixtures listed in tests/fixtures/*-sources.json
 * into tests/fixtures/local/ (gitignored: third-party lyrics are copyrighted).
 *
 * Only URLs, metadata and checksums are committed. The command is a manual
 * setup step: CI never runs it and tests never touch the network.
 *
 * Usage:
 *   node scripts/fetch-fixtures.mjs [--only ug|pdf] [--force] [--check]
 *
 *   --only    download only one group
 *   --force   refresh files that already exist
 *   --check   verify local files against the manifest, download nothing
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tests/fixtures');
const LOCAL = join(FIXTURES, 'local');
const MANIFEST_PATH = join(LOCAL, 'manifest.json');
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0 Safari/537.36';
const DELAY_MS = 800;

const args = process.argv.slice(2);
const onlyIndex = args.indexOf('--only');
const only = onlyIndex === -1 ? null : args[onlyIndex + 1];
const force = args.includes('--force');
const check = args.includes('--check');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const NAMED_ENTITIES = {
  atilde: 'ã',
  otilde: 'õ',
  ccedil: 'ç',
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  agrave: 'à',
  acirc: 'â',
  ecirc: 'ê',
  ocirc: 'ô',
  uuml: 'ü',
  ntilde: 'ñ',
  ordm: 'º',
  ordf: 'ª',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”'
};

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** UG embeds the tab text in a data-content JSON blob (wiki_tab). */
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

async function download(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: '*/*' }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchUg(source) {
  const body = await download(source.url);
  const content = extractTabText(body.toString('utf8'));
  if (!content) throw new Error('tab content not found in the page');
  return Buffer.from(content, 'utf8');
}

async function fetchPdf(source) {
  const body = await download(source.url);
  if (body.subarray(0, 5).toString() !== '%PDF-') throw new Error('response is not a PDF');
  return body;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function loadJson(name) {
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
}

function manifestEntries() {
  const groups = [
    { id: 'ug', sources: loadJson('ug-sources.json'), extension: 'txt' },
    { id: 'pdf', sources: loadJson('pdf-sources.json'), extension: 'pdf' }
  ];
  const entries = [];
  for (const group of groups) {
    for (const source of group.sources) {
      const relative = join(group.id, `${source.slug}.${group.extension}`);
      const absolute = join(LOCAL, relative);
      if (!existsSync(absolute)) continue;
      const buffer = readFileSync(absolute);
      entries.push({
        path: relative.replaceAll('\\', '/'),
        group: group.id,
        url: source.url,
        sha256: sha256(buffer),
        bytes: buffer.byteLength
      });
    }
  }
  return entries;
}

function writeManifest() {
  const payload = { generated: new Date().toISOString(), files: manifestEntries() };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function checkManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error('No manifest: run the fetch command first.');
    return false;
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  let ok = true;
  for (const entry of manifest.files) {
    const absolute = join(LOCAL, entry.path);
    if (!existsSync(absolute)) {
      console.error(`MISSING ${entry.path}`);
      ok = false;
      continue;
    }
    const digest = sha256(readFileSync(absolute));
    if (digest !== entry.sha256) {
      console.error(`DRIFT   ${entry.path}`);
      ok = false;
    } else {
      console.log(`ok      ${entry.path}`);
    }
  }
  return ok;
}

async function run() {
  if (check) process.exitCode = checkManifest() ? 0 : 1;
  if (check) return;

  const groups = [];
  if (!only || only === 'ug') groups.push({ id: 'ug', sources: loadJson('ug-sources.json') });
  if (!only || only === 'pdf') groups.push({ id: 'pdf', sources: loadJson('pdf-sources.json') });

  mkdirSync(join(LOCAL, 'ug'), { recursive: true });
  mkdirSync(join(LOCAL, 'pdf'), { recursive: true });

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const group of groups) {
    for (const source of group.sources) {
      const extension = group.id === 'ug' ? 'txt' : 'pdf';
      const target = join(LOCAL, group.id, `${source.slug}.${extension}`);
      if (existsSync(target) && !force) {
        skipped += 1;
        console.log(`skip    ${group.id}/${source.slug}`);
        continue;
      }
      try {
        const buffer = group.id === 'ug' ? await fetchUg(source) : await fetchPdf(source);
        writeFileSync(target, buffer);
        saved += 1;
        console.log(`saved   ${group.id}/${source.slug} (${buffer.byteLength} bytes)`);
      } catch (error) {
        failed += 1;
        console.error(`FAIL    ${group.id}/${source.slug}: ${error.message}`);
      }
      await sleep(DELAY_MS);
    }
  }

  writeManifest();
  console.log(`\n${saved} saved, ${skipped} skipped, ${failed} failed.`);
  console.log(`Output:  ${LOCAL}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  if (failed > 0) process.exitCode = 1;
}

await run();

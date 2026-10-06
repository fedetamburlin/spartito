import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function findChrome(): string | null {
  const fromEnv = process.env.SPARTITO_CHROME_PATH;
  if (fromEnv) return existsSync(fromEnv) ? fromEnv : null;
  for (const candidate of chromeCandidates()) {
    if (path.isAbsolute(candidate)) {
      if (existsSync(candidate)) return candidate;
    } else {
      const found = which(candidate);
      if (found) return found;
    }
  }
  return null;
}

function chromeCandidates(): string[] {
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];
  }
  if (process.platform === 'win32') {
    return [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
  }
  return ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
}

function which(command: string): string | null {
  const entries = (process.env.PATH ?? '').split(path.delimiter);
  const extensions =
    process.platform === 'win32' ? (process.env.PATHEXT ?? '.EXE').split(';') : [''];
  for (const entry of entries) {
    for (const extension of extensions) {
      const candidate = path.join(entry, command + extension);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export interface PdfExportResult {
  bytes: number;
}

export async function printToPdf(
  url: string,
  outPath: string,
  timeoutMs = 60_000
): Promise<PdfExportResult> {
  const chrome = findChrome();
  if (!chrome) {
    throw new Error(
      'Google Chrome or Chromium not found. Install it or set SPARTITO_CHROME_PATH.'
    );
  }
  mkdirSync(path.dirname(outPath), { recursive: true });
  const profile = mkdtempSync(path.join(tmpdir(), 'spartito-chrome-'));
  try {
    await runChrome(chrome, profile, url, outPath, timeoutMs);
    const stats = statSync(outPath);
    if (stats.size === 0) throw new Error('Chrome produced an empty PDF');
    return { bytes: stats.size };
  } catch (error) {
    rmSync(outPath, { force: true });
    throw error;
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

function runChrome(
  chrome: string,
  profile: string,
  url: string,
  outPath: string,
  timeoutMs: number
): Promise<void> {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--virtual-time-budget=15000',
    '--run-all-compositor-stages-before-draw',
    '--no-pdf-header-footer',
    `--user-data-dir=${profile}`,
    `--print-to-pdf=${outPath}`,
    url
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += String(chunk);
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Chrome timed out while printing the PDF'));
    }, timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Chrome exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

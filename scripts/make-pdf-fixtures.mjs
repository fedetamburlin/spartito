#!/usr/bin/env node
/**
 * Regenerates the committed PDF fixtures in tests/fixtures/generated/.
 *
 * Requires Google Chrome/Chromium (set SPARTITO_CHROME_PATH to override).
 * The content is invented on purpose: fixtures must not embed third-party
 * lyrics. Run from the repo root:
 *
 *   node scripts/make-pdf-fixtures.mjs
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'tests', 'fixtures', 'generated');
const WORK_DIR = join(tmpdir(), 'spartito-pdf-fixtures');

function findChrome() {
  const candidates = [
    process.env.SPARTITO_CHROME_PATH,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser'
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      execFileSync('which', [candidate], { stdio: 'ignore' });
      return candidate;
    } catch {
      /* try the next one */
    }
  }
  throw new Error('Chrome/Chromium not found: set SPARTITO_CHROME_PATH');
}

const CHROME = findChrome();

function run(args) {
  execFileSync(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', ...args], {
    stdio: 'ignore'
  });
}

function htmlDocument(body, extraCss = '') {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 14mm; }
  body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11pt; color: #111; margin: 0; }
  pre { font-family: 'DejaVu Sans Mono', monospace; font-size: 10pt; line-height: 1.45; margin: 0 0 6mm; white-space: pre; }
  h1 { font-size: 18pt; margin: 0 0 2mm; }
  .meta { font-size: 10pt; color: #333; margin-bottom: 6mm; }
  .page-number { margin: 6mm 0; font-size: 9pt; color: #555; }
  ${extraCss}
</style></head><body>${body}</body></html>`;
}

const singleColumn = htmlDocument(`
  <pre>Song: Generated Song
Artist: The Test Band
Capo: 2

[Verse 1]
Am        F
Walking down the empty road
C         G
With a guitar on my back

[Chorus]
F         C
Sing it loud, sing it clear
G         Am
This is a generated song

[Verse 2]
Am           F
Another verse with simple chords
C            G
Nothing here is borrowed</pre>
`);

const twoColumns = htmlDocument(
  `
  <h1>Two Column Song</h1>
  <div class="cols">
    ${Array.from(
      { length: 8 },
      (_, index) => `<pre>[Verse ${index + 1}]
Am        F
Generated line number ${index + 1} here
C         G
Another generated line for the page

</pre>`
    ).join('')}
  </div>
`,
  `.cols { column-count: 2; column-gap: 14mm; } h1 { column-span: all; }`
);

const noise = htmlDocument(`
  <div class="page-number">Page 1/2</div>
  <pre>Generated Noise Song
The Test Band
Fake Album (2026)

[Verse]
Am        F
This line survives the noise filter
C         G
This one too, keep it in the sheet

Page 1/2
——————————————

[Chorus]
F         C
Sing it loud, sing it clear
G         Am
Generated words are all you hear</pre>
`);

const misaligned = htmlDocument(`
  <pre>Song: Misaligned Song
Artist: The Test Band

[Verse]
   Am          F
Hello world this is a line
        C              G
Second line with odd spacing
Am7
Third line has an annotation
(2x)

[Outro]
      Dm        G
Final line, shifted right
</pre>
`);

const scanSource = `
  <h1>Scanned Sheet</h1>
  <p class="meta">This page is an image: there is no text layer.</p>
  <pre>Am        F
Walking down the empty road
C         G
With a guitar on my back</pre>
`;

const multipageColumns = htmlDocument(
  `
  <div class="running top">Generated Songbook</div>
  <div class="cols">
    ${Array.from(
      { length: 36 },
      (_, index) => `<pre>[Verse ${index + 1}]
Am        F
Generated line number ${index + 1} here
C         G
Another generated line for the page

</pre>`
    ).join('')}
  </div>
  <div class="running bottom">Page 1/3</div>
`,
  `.cols { column-count: 2; column-gap: 14mm; }
   .cols pre { break-inside: avoid; }
   .running { position: fixed; left: 0; right: 0; font-size: 8pt; color: #666; }
   .running.top { top: 0; }
   .running.bottom { bottom: 0; text-align: center; }`
);

const rotated = htmlDocument(
  `
  <div class="vertical">
    <h1>Rotated Sheet</h1>
    <pre>Am        F
Walking down the empty road
C         G
With a guitar on my back</pre>
  </div>
`,
  `@page { size: A4 portrait; margin: 12mm; }
   .vertical { writing-mode: vertical-rl; text-orientation: mixed; height: 260mm; }
   .vertical pre { font-size: 9pt; }`
);

const mixed = htmlDocument(
  `
  <h1>Mixed Content</h1>
  <p>Text before the image, then the image, then more text.</p>
  <img alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=">
  <pre>Am        F
After the image the chords continue
C         G
Generated words are all you hear</pre>
`,
  'img { width: 40mm; height: 20mm; background: #333; }'
);

const hyphenated = htmlDocument(
  `
  <h1>Hyphenation</h1>
  <p class="hyphen">This is an extra&#173;ordinarily compli&#173;cated demon&#173;stration of hyphen&#173;ation with long words and a justified column of text.</p>
  <pre>Am        F
Walking down the empty road
C         G
With a guitar on my back</pre>
`,
  `@page { size: A4; margin: 14mm; }
   .hyphen { font-family: 'DejaVu Serif', serif; hyphens: auto; text-align: justify; width: 90mm; }`
);

function findGs() {
  for (const candidate of ['gs', 'gswin64c', 'gswin32c']) {
    try {
      execFileSync('which', [candidate], { stdio: 'ignore' });
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

function encryptPdf(sourceName, targetName) {
  const gs = findGs();
  if (!gs) {
    console.log(`skip ${targetName}.pdf (Ghostscript not found)`);
    return;
  }
  const source = join(OUT_DIR, `${sourceName}.pdf`);
  const target = join(OUT_DIR, `${targetName}.pdf`);
  execFileSync(
    gs,
    [
      '-q',
      '-dNOPAUSE',
      '-dBATCH',
      '-sDEVICE=pdfwrite',
      `-sOutputFile=${target}`,
      '-sOwnerPassword=owner',
      '-sUserPassword=user',
      '-dEncryptionR=3',
      '-dKeyLength=128',
      '-dPermissions=-4',
      '-f',
      source
    ],
    { stdio: 'ignore' }
  );
  console.log(`wrote ${targetName}.pdf (encrypted)`);
}

function printPdf(name, html) {
  const htmlPath = join(WORK_DIR, `${name}.html`);
  const pdfPath = join(OUT_DIR, `${name}.pdf`);
  writeFileSync(htmlPath, html, 'utf8');
  run(['--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href]);
  console.log(`wrote ${name}.pdf`);
}

function printScanPdf(name) {
  const sourcePath = join(WORK_DIR, `${name}.html`);
  const screenshotPath = join(WORK_DIR, `${name}.png`);
  const wrapperPath = join(WORK_DIR, `${name}-wrapper.html`);
  const pdfPath = join(OUT_DIR, `${name}.pdf`);

  writeFileSync(sourcePath, htmlDocument(scanSource), 'utf8');
  run([
    '--hide-scrollbars',
    '--window-size=1240,1754',
    `--screenshot=${screenshotPath}`,
    pathToFileURL(sourcePath).href
  ]);
  writeFileSync(
    wrapperPath,
    htmlDocument(
      `<img src="${pathToFileURL(screenshotPath).href}" alt="">`,
      `@page { size: A4; margin: 0; } body { margin: 0; } img { width: 210mm; height: 297mm; object-fit: cover; }`
    ),
    'utf8'
  );
  run(['--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, pathToFileURL(wrapperPath).href]);
  console.log(`wrote ${name}.pdf (image only)`);
}

rmSync(WORK_DIR, { recursive: true, force: true });
mkdirSync(WORK_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

printPdf('generated-single-column', singleColumn);
printPdf('generated-two-columns', twoColumns);
printPdf('generated-noise', noise);
printPdf('generated-misaligned', misaligned);
printPdf('generated-multipage-columns', multipageColumns);
printPdf('generated-rotated', rotated);
printPdf('generated-mixed', mixed);
printPdf('generated-hyphenated', hyphenated);
printScanPdf('generated-scan');
encryptPdf('generated-single-column', 'generated-encrypted');

rmSync(WORK_DIR, { recursive: true, force: true });

#!/usr/bin/env node
/**
 * Regenerates the committed PDF fixtures in tests/fixtures/generated/.
 *
 * Requires Google Chrome/Chromium (set SPARTITO_CHROME_PATH to override).
 * The content is invented on purpose: fixtures must not embed third-party
 * lyrics. Run from the repo root:
 *
 *   node tests/fixtures/generate/make-pdfs.mjs
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'generated');
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
printScanPdf('generated-scan');

rmSync(WORK_DIR, { recursive: true, force: true });

# Spartito

[![Deploy to GitHub Pages](https://github.com/fedetamburlin/spartito/actions/workflows/deploy.yml/badge.svg)](https://github.com/fedetamburlin/spartito/actions/workflows/deploy.yml)

Live site: https://fedetamburlin.github.io/spartito/

Minimal editor to create **A4 portrait PDF song sheets** (lyrics + chords), meant to be read on any tablet as a PDF: one song = one page, automatic columns, tight margins to use the whole sheet.

The app UI is in Italian.

Project documentation: `doc/sota.md`, `doc/stack.md`, `doc/features.md`, `doc/market.md` (in Italian). Defaults can be changed in `config/defaults.json`.

## Requirements

- Node.js 18.19+ (20/22/24 LTS recommended). On Node 18 the project uses Vite 6 + Svelte 5.
- npm.

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | static build into `dist/` |
| `npm run preview` | serve the build |
| `npm run check` | svelte-check (TypeScript + Svelte) |
| `npm test` | unit tests (Vitest) |

## Usage

Source in **ChordPro (subset)** in the left editor, A4 preview on the right:

- `{title: ...}`, `{subtitle: ...}`, `{comment: ...}` (or `{c: ...}`)
- inline chords: `[Am]word`, also multiple `[C][G]word`
- chorus: `{start_of_chorus}`/`{soc}` … `{end_of_chorus}`/`{eoc}`; verse `{start_of_verse}`/`{sov}` optional
- unsupported directives are ignored in the preview but **preserved** on export

Auto-fit: tries 1 column → 2 columns → font reduction down to the minimum (6pt lyrics / 5pt chords; default 11/10) → warning if the song does not fit. The exported PDF stays on one page.

PDF export: **Stampa PDF** button (Chrome/Chromium), choosing "Save as PDF" with default margins and headers disabled. Source import/export in `.cho` and `.json`; autosave in `localStorage`.

**Import from websites ("Incolla testo"):** copy lyrics/chords from a site (Ultimate Guitar, Accordi e Spartiti, …) and paste them into the dialog. Conversion is automatic: chords above lyrics aligned by columns → inline, international and Italian notation (`MIm`, `LAm7`, `DO7+`, `MIm/RE`), section headers (`[Verse]`, `[Chorus]`, `Ritornello`, …), title/artist from UG pages ("Chords"/"Tabs" marker), `Capo/Tuning` and `(instrumental)`/`(2x)` annotations as comments, tablature and decorative/pagination lines dropped, chord-only lines rendered as an intro. Valid ChordPro passes through unchanged. Dictionaries and patterns live in `config/import.json`.

**Transposition:** `Trasponi − [0] +` stepper in the toolbar (or `+`/`−` keys when the editor is not focused; click the value to reset). It changes the preview and the PDF, **not** the source or the `.cho` export; the choice is saved in the settings. Notation (international/Italian) and chord suffixes are preserved.

**PDF import:** "Importa file" also accepts `.pdf` (text PDFs only, not scans): it extracts text with `unpdf`, rebuilds lines and columns from coordinates and opens the review in ImportDialog. Chord/syllable alignment is preserved; unusual PDFs should be checked before applying.

**Capo:** `{capo: N}` directive (Arabic or Roman numerals) read from the source and shown as "Capo N" under the title. If the song has a capo, transposition moves the capo and leaves the shapes unchanged (e.g. "Capo 2", +2 → "Capo 4" with the same chords); if `C0+T` goes below zero, the capo stops at 0 and the chords go down. Without a capo, classic transposition. Import converts "Capo 3"/"capo at V" into `{capo: N}`.

## Structure

```
config/defaults.json     project defaults (page, layout, fonts, colors, export)
config/import.json       import dictionaries (sections, metadata labels)
public/fonts/            OFL fonts (Inter, Source Serif 4, JetBrains Mono) + licenses
src/core/                pure TS: config, model, chordpro (parse/serialize), chords (grammar),
                         transpose, import (copy-paste conversion), pdf (PDF text extraction),
                         fit, persistence, settings
src/ui/                  Svelte components + styles (app.css, paper.css) + measure.ts
tests/                   ChordPro/import fixtures and unit tests
```

## Status

Working POC (P0): single-song editor, A4 preview, auto-fit, PDF export, import/export, local persistence, copy-paste import from websites, PDF import (text), transposition and capo.
P1/P2 backlog in `doc/features.md` (CodeMirror 6, automatic export, PWA, song library, notation, MCP).

## License

MIT. Donations: PayPal link to be defined.
Fonts under SIL Open Font License 1.1 (see `public/fonts/OFL-*.txt`).

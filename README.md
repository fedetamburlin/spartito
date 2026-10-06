# Spartito

[![Deploy to GitHub Pages](https://github.com/fedetamburlin/spartito/actions/workflows/deploy.yml/badge.svg)](https://github.com/fedetamburlin/spartito/actions/workflows/deploy.yml)

Live site: https://fedetamburlin.github.io/spartito/

Minimal editor for **A4 portrait song sheets** (lyrics + chords), designed to be read on a tablet as a PDF. One song per page, automatic columns, tight margins. The UI is in English.

## Requirements

- Node.js 18.19+ (20/22/24 LTS recommended)
- npm

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | static build into `dist/` |
| `npm run preview` | serve the build |
| `npm run check` | svelte-check (TypeScript + Svelte) |
| `npm test` | unit tests (Vitest) |

## Usage

Source in **ChordPro (subset)** in the left editor, A4 preview on the right. A draggable divider resizes the panes (double-click it or press Home to reset).

- `{title: ...}`, `{subtitle: ...}`, `{comment: ...}` (or `{c: ...}`)
- inline chords `[Am]word`, also multiple `[C][G]word`
- sections: `{start_of_chorus}`/`{soc}` … `{end_of_chorus}`/`{eoc}`; `{start_of_verse}`/`{sov}` optional
- unsupported directives are ignored in the preview but preserved on export
- auto-fit: 1 column → 2 columns → font down to 6pt lyrics / 5pt chords (defaults 11/10); exported PDF stays on one page
- **Print PDF**: Chrome/Chromium, "Save as PDF", default margins, headers off
- import/export of `.cho` and `.json` sources; autosave in `localStorage`
- **Paste text**: converts copy-paste from websites (Ultimate Guitar, Accordi e Spartiti, …), including Italian chord notation, section headers and UG title/artist markers; dictionaries in `config/import.json`
- **Import file**: also accepts text PDFs (via `unpdf`)
- **Transpose** stepper (or `+`/`−` keys): changes preview and PDF only, not the source or `.cho` export
- `{capo: N}` is shown under the title; transposition moves the capo and keeps the chord shapes

## Structure

```
config/        project defaults and import dictionaries
public/fonts/  OFL fonts (Inter, Source Serif 4, JetBrains Mono) + licenses
src/core/      pure TS: config, model, chordpro, chords, transpose, import, pdf, fit, persistence, settings
src/ui/        Svelte components, styles and measurement
tests/         fixtures and unit tests
```

## Status

Working POC (P0). P1/P2 backlog: CodeMirror 6, automatic export, PWA, song library, notation, MCP.

## License

MIT. Fonts under SIL Open Font License 1.1 (see `public/fonts/OFL-*.txt`).

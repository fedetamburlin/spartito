# Spartito

[![Deploy to GitHub Pages](https://github.com/fedetamburlin/spartito/actions/workflows/deploy.yml/badge.svg)](https://github.com/fedetamburlin/spartito/actions/workflows/deploy.yml)

Live site: https://fedetamburlin.github.io/spartito/

Minimal editor for **A4 portrait song sheets** (lyrics + chords), made to be read on a tablet as a PDF. One song per page, automatic columns, tight margins. The UI is in English.

## Quick start

Node.js 20.19+ (22 LTS recommended; see `.nvmrc`) and npm:

| Command                                        | Description                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`                                  | Vite dev server                                                                       |
| `npm run build`                                | static build into `dist/`                                                             |
| `npm run preview`                              | serve the build                                                                       |
| `npm run check`                                | svelte-check (TypeScript + Svelte)                                                    |
| `npm run lint` · `format` · `format:check`     | ESLint and Prettier                                                                   |
| `npm test`                                     | unit tests (Vitest)                                                                   |
| `npm run test:e2e`                             | browser smoke tests (Playwright/Chromium; run `npx playwright install chromium` once) |
| `npm run fixtures:sync` · `fixtures:check`     | download / verify the local-only real-world corpus                                    |
| `npm run mcp:build` · `mcp:check` · `mcp:test` | build, type-check, test the MCP server                                                |

## Using the app

Source in **ChordPro (subset)** in the left editor (CodeMirror 6: chords, directives and comments highlighted, search with Ctrl+F, undo/redo), live A4 preview on the right; drag the divider to resize the panes (double-click or Home to reset).

- **Insert** menu (grouped snippets) and **?** syntax reference in the editor header — every command shown there is verified by the test suite
- **Songs sidebar** on the left (collapsible to an icon rail): keep many songs, one active at a time, each with its own source, settings and transposition; rename, duplicate and delete from the list. Songs live in IndexedDB; the old single-song autosave is migrated automatically
- **Dark theme** for the app chrome (the A4 sheet stays white): follows the system by default, sun/moon toggle at the end of the settings row
- chords `[Am]word`, `[C][G]word`, Italian note names `[Do]`; blank lines separate paragraphs, also inside sections
- canonical directive names only (`{title}`, `{start_of_chorus}`, …), with `{chorus}`/`{rit}` as compact chorus recall; unsupported directives are ignored in the preview (a badge reports how many) and preserved on export
- auto-fit: 1 column → 2 columns → font down to 6pt lyrics / 5pt chords (defaults 11/10); the Text size you choose is never increased automatically, and the field stops at the largest size that keeps the song on one page; the PDF stays on one page, with a warning when even the minimum does not fit
- **Transpose** stepper (or `+`/`−` keys): preview and PDF only; `{capo: N}` is shown under the title and moves with transposition
- **From text**: paste from Ultimate Guitar or any chord site, conversion is automatic (Italian notation, sections, UG title/artist markers); **From file**: `.cho`, `.crd`, `.json` and text PDFs
- **Export chords** (`.cho`), **Print PDF** (Chrome/Chromium → Save as PDF, default margins, headers off) and **Songbook**: pick songs from the library, set their order and print them as a single PDF, one song per sheet

## Tests

`npm test` covers the parser, import (text and PDF), layout, transposition, library, songbook and the app-side MCP bridge. `npm run test:e2e` builds the app and drives real Chromium flows: editing, Insert menu, import dialog, library CRUD, PDF export, songbook export and the storage-unavailable fallback.

The real-world corpus is **local only** (copyrighted text, gitignored): `node scripts/fetch-fixtures.mjs` downloads 20 Ultimate Guitar pages and 5 real PDFs, then `npm test` runs the structural checks. `--check` verifies the checksums without network. See [`tests/README.md`](tests/README.md) for the layer map, conventions and fixture catalogue.

## MCP server (opencode)

`packages/mcp` connects an MCP client to the open song in the web app (the active one in the library):

- `get_song` — read the current ChordPro source, parsed document and settings
- `set_song` — replace the editor source
- `update_settings` — change font, text size, columns, margins, colours, transposition
- `export_pdf` — render the current song with headless Chrome into `out/<song>.pdf`

Setup: `npm install && npm run mcp:build`, then restart opencode (MCP servers load at startup). `opencode.json` registers the server:

```json
{ "mcp": { "spartito": { "type": "local", "command": ["node", "packages/mcp/dist/index.js"] } } }
```

Click **MCP** in the toolbar: the dot turns green when connected (bridge on `127.0.0.1:7331` only; hover a red dot for the cause). Keep the app open while using the tools — without a connection they reply with an explanatory error. To verify, ask the agent _"which spartito tools do you have?"_, then _"read the open song"_. Chrome/Edge may ask for local network access the first time; Safari blocks `ws://localhost` from an HTTPS page, so run the app locally (`npm run build && npm run preview -- --port 4173`).

`export_pdf` needs Google Chrome/Chromium (override with `SPARTITO_CHROME_PATH`) and renders `SPARTITO_APP_URL` — the live site by default; set it to your local app (e.g. `http://localhost:4175`) to export the code you are developing. Output folder: `SPARTITO_OUT_DIR` (default `out/`). Only one opencode session can own port `7331`; the same process exposes a Streamable HTTP endpoint at `http://127.0.0.1:7331/mcp`.

## Project layout

```
config/        project defaults and import dictionaries
public/fonts/  OFL fonts (Inter, IBM Plex Sans Condensed, JetBrains Mono) + licenses
src/core/      pure TS: config, model, db, library, directives, chordpro, chords, transpose, import, pdf, fit, highlight, persistence, settings
src/ui/        Svelte components, styles and measurement
packages/mcp/  local MCP server: tools, websocket bridge, stdio/HTTP transports, PDF export
tests/         unit/integration tests, fixtures, Playwright E2E (see tests/README.md)
scripts/       fixture downloaders and PDF fixture generator
docs/adr/      architecture decision records
```

Architecture and decision records: [`ARCHITECTURE.md`](ARCHITECTURE.md),
[`docs/adr`](docs/adr). How to contribute: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Status and license

Working POC (P0) with the song library, import from PDF/text and the MCP bridge. P1/P2 backlog: more page formats, automatic export, PWA, setlists, notation.

MIT. Fonts under SIL Open Font License 1.1 (see `public/fonts/OFL-*.txt`).

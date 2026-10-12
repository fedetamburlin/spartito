# Spartito

[![Deploy to GitHub Pages](https://github.com/fedetamburlin/spartito/actions/workflows/deploy.yml/badge.svg)](https://github.com/fedetamburlin/spartito/actions/workflows/deploy.yml)

Live site: https://fedetamburlin.github.io/spartito/

Minimal editor for **A4 portrait song sheets** (lyrics + chords), made to be read on a tablet as a PDF. One song per page, automatic columns, tight margins. The UI is in English.

## Quick start

Node.js 18.19+ (20/22/24 LTS recommended) and npm:

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | static build into `dist/` |
| `npm run preview` | serve the build |
| `npm run check` | svelte-check (TypeScript + Svelte) |
| `npm test` | unit tests (Vitest) |
| `npm run mcp:build` · `mcp:check` · `mcp:test` | build, type-check, test the MCP server |

## Using the app

Source in **ChordPro (subset)** in the left editor, live A4 preview on the right; drag the divider to resize the panes (double-click or Home to reset).

- **Insert** menu (grouped snippets) and **?** syntax reference in the editor header — every command shown there is verified by the test suite
- **Songs sidebar** on the left (collapsible to an icon rail): keep many songs, one active at a time, each with its own source, settings and transposition; rename, duplicate and delete from the list. Songs live in IndexedDB; the old single-song autosave is migrated automatically
- **Dark theme** for the app chrome (the A4 sheet stays white): follows the system by default, sun/moon toggle at the end of the settings row
- chords `[Am]word`, `[C][G]word`, Italian note names `[Do]`; blank lines separate paragraphs, also inside sections
- canonical directive names only (`{title}`, `{start_of_chorus}`, …), with `{chorus}`/`{rit}` as compact chorus recall; unsupported directives are ignored in the preview (a badge reports how many) and preserved on export
- auto-fit: 1 column → 2 columns → font down to 6pt lyrics / 5pt chords (defaults 11/10); the PDF stays on one page, with a warning when the song does not fit
- **Transpose** stepper (or `+`/`−` keys): preview and PDF only; `{capo: N}` is shown under the title and moves with transposition
- **From text**: paste from Ultimate Guitar or any chord site, conversion is automatic (Italian notation, sections, UG title/artist markers); **From file**: `.cho`, `.crd`, `.json` and text PDFs
- **Export chords** (`.cho`) and **Print PDF** (Chrome/Chromium → Save as PDF, default margins, headers off); autosave in `localStorage`

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

Click **MCP** in the toolbar: the dot turns green when connected (bridge on `127.0.0.1:7331` only; hover a red dot for the cause). Keep the app open while using the tools — without a connection they reply with an explanatory error. To verify, ask the agent *"which spartito tools do you have?"*, then *"read the open song"*. Chrome/Edge may ask for local network access the first time; Safari blocks `ws://localhost` from an HTTPS page, so run the app locally (`npm run build && npm run preview -- --port 4173`).

`export_pdf` needs Google Chrome/Chromium (override with `SPARTITO_CHROME_PATH`) and renders `SPARTITO_APP_URL` — the live site by default; set it to your local app (e.g. `http://localhost:4175`) to export the code you are developing. Output folder: `SPARTITO_OUT_DIR` (default `out/`). Only one opencode session can own port `7331`; the same process exposes a Streamable HTTP endpoint at `http://127.0.0.1:7331/mcp`.

## Project layout

```
config/        project defaults and import dictionaries
public/fonts/  OFL fonts (Inter, IBM Plex Sans Condensed, JetBrains Mono) + licenses
src/core/      pure TS: config, model, db, library, directives, chordpro, chords, transpose, import, pdf, fit, persistence, settings
src/ui/        Svelte components, styles and measurement
packages/mcp/  local MCP server: tools, websocket bridge, stdio/HTTP transports, PDF export
tests/         fixtures and unit tests
```

## Status and license

Working POC (P0). P1/P2 backlog: CodeMirror 6, automatic export, PWA, song library, notation.

MIT. Fonts under SIL Open Font License 1.1 (see `public/fonts/OFL-*.txt`).

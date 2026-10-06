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
| `npm run mcp:build` | build the local MCP server (`packages/mcp`) |
| `npm run mcp:check` | type-check the MCP server |
| `npm run mcp:test` | unit/integration tests for the MCP server |

## Usage

Source in **ChordPro (subset)** in the left editor, A4 preview on the right. A draggable divider resizes the panes (double-click it or press Home to reset).

- `{title: ...}`, `{subtitle: ...}`, `{comment: ...}` (or `{c: ...}`)
- inline chords `[Am]word`, also multiple `[C][G]word`
- sections: `{start_of_chorus}`/`{soc}` … `{end_of_chorus}`/`{eoc}`; `{start_of_verse}`/`{sov}` optional
- compact chorus recall `{chorus}`/`{rit}` (label via `{chorus: Final}`)
- tab blocks `{start_of_tab}`/`{sot}` … `{eot}` (kept literal, monospace) and chord grids `{start_of_grid}`/`{sog}` … `{eog}`
- editor **Insert** menu: sections, comment, grid, tab and capo snippets at the cursor (selection gets wrapped)
- unsupported directives are ignored in the preview but preserved on export
- auto-fit: 1 column → 2 columns → font down to 6pt lyrics / 5pt chords (defaults 11/10); exported PDF stays on one page
- **Print PDF**: Chrome/Chromium, "Save as PDF", default margins, headers off
- import/export of `.cho` and `.json` sources; autosave in `localStorage`
- **Paste text**: converts copy-paste from websites (Ultimate Guitar, Accordi e Spartiti, …), including Italian chord notation, section headers and UG title/artist markers; dictionaries in `config/import.json`
- **Import file**: also accepts text PDFs (via `unpdf`)
- **Transpose** stepper (or `+`/`−` keys): changes preview and PDF only, not the source or `.cho` export
- `{capo: N}` is shown under the title; transposition moves the capo and keeps the chord shapes

## MCP server (opencode)

`packages/mcp` is a local MCP server that connects the opencode agent to the song open in the web app:

- `get_song` — read the current ChordPro source, parsed document and settings
- `set_song` — replace the editor source
- `update_settings` — change font, text size, columns, margins, colors, transposition
- `export_pdf` — render the current song with headless Chrome into `out/<song>.pdf`

Setup (once):

```bash
npm install
npm run mcp:build
```

`opencode.json` in this repo registers the server with autostart:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "spartito": {
      "type": "local",
      "command": ["node", "packages/mcp/dist/index.js"]
    }
  }
}
```

Restart opencode after adding or changing the config: MCP servers are loaded at startup. To verify, ask the agent *"which spartito tools do you have?"* (the four above) and then *"read the open song"*.

Then open the web app and click **opencode** in the toolbar: the status dot turns green when connected. The bridge listens on `127.0.0.1:7331` only and accepts the app origin; without a connected app the tools reply with an explanatory error. If the dot turns red, hover it: the tooltip explains the likely cause (server not running or browser local network access blocked).

Browser notes:

- Chrome/Edge 147+ asks for **local network access** the first time; click Allow.
- Safari blocks `ws://localhost` from an HTTPS page: use the app locally instead.
- To skip browser permissions entirely, run the app locally: `npm run build && npm run preview -- --port 4173`, then open `http://localhost:4173`.
- Only one opencode session can own port `7331`: a second session logs the HTTP/bridge as disabled and its tools cannot reach the app.

Requirements: Node 18+ and Google Chrome/Chromium for `export_pdf` (override the binary with `SPARTITO_CHROME_PATH`, the app URL with `SPARTITO_APP_URL`, the output folder with `SPARTITO_OUT_DIR`). The same process also exposes a Streamable HTTP MCP endpoint at `http://127.0.0.1:7331/mcp` for other MCP clients; `node packages/mcp/dist/index.js --serve` runs it without stdio.

## Structure

```
config/        project defaults and import dictionaries
public/fonts/  OFL fonts (Inter, Source Serif 4, JetBrains Mono) + licenses
src/core/      pure TS: config, model, chordpro, chords, transpose, import, pdf, fit, persistence, settings
src/ui/        Svelte components, styles and measurement
packages/mcp/  local MCP server: tools, websocket bridge, stdio/HTTP transports, PDF export
tests/         fixtures and unit tests
```

## Status

Working POC (P0). P1/P2 backlog: CodeMirror 6, automatic export, PWA, song library, notation.

## License

MIT. Fonts under SIL Open Font License 1.1 (see `public/fonts/OFL-*.txt`).

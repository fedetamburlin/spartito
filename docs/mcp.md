# MCP server

`packages/mcp` exposes the song open in the Spartito web app to an MCP client
such as opencode. It is a local Node process: the MCP transport runs over stdio
and/or HTTP, while the browser app connects to a WebSocket bridge on
`127.0.0.1:7331`.

The app must be open and connected. Without a bridge connection, tool calls
return an explanatory error.

## Tools

| Tool              | What it does                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `get_song`        | Returns the open song's ChordPro source, parsed document and layout settings.               |
| `set_song`        | Replaces the editor source.                                                                 |
| `update_settings` | Updates font, text size, columns, margins, colours and transposition.                       |
| `export_pdf`      | Renders the open song with headless Chrome and writes an A4 PDF (default `out/<song>.pdf`). |

## Setup

```bash
npm ci
npm run mcp:build
```

Register the server in your MCP client. For opencode, the repository already
contains this entry in `opencode.json`:

```json
{
  "mcp": {
    "spartito": {
      "type": "local",
      "command": ["node", "packages/mcp/dist/index.js"]
    }
  }
}
```

Restart the client after building or changing the MCP server: MCP servers load
at startup.

Then open Spartito and click **MCP** in the toolbar. The dot turns green when
the browser bridge is connected.

## PDF export

`export_pdf` needs Google Chrome or Chromium. It renders the page at
`SPARTITO_APP_URL` (default: `https://fedetamburlin.github.io/spartito`) with a
headless browser and writes the PDF to `SPARTITO_OUT_DIR` (default `out/`).

To export the code you are developing, point it at a local build:

```bash
npm run build
npm run preview -- --port 4173
```

Then set `SPARTITO_APP_URL=http://localhost:4173` in the environment that
launches the MCP server (for example in the `environment`/`env` section of your
MCP client configuration) and restart the client.

Environment variables:

| Variable               | Default                                    | Purpose                          |
| ---------------------- | ------------------------------------------ | -------------------------------- |
| `SPARTITO_APP_URL`     | `https://fedetamburlin.github.io/spartito` | App URL rendered by `export_pdf` |
| `SPARTITO_CHROME_PATH` | auto-detected                              | Chrome/Chromium binary           |
| `SPARTITO_OUT_DIR`     | `out/`                                     | PDF output folder                |
| `SPARTITO_BRIDGE_PORT` | `7331`                                     | Bridge and HTTP port             |

Only one MCP process can own the bridge port. The same process also exposes a
Streamable HTTP endpoint at `http://127.0.0.1:7331/mcp`.

## Troubleshooting

- **Red dot or connection refused** — the app is not open, the MCP server is not
  running, or another process owns the bridge port.
- **Chrome not found** — install Chrome/Chromium or set `SPARTITO_CHROME_PATH`.
- **Safari** — Safari blocks `ws://localhost` from an HTTPS page. Run the app
  locally when using MCP.
- **Local network prompt** — Chrome/Edge may ask for local network access the
  first time; allow it.
- **Client shows no tools** — rebuild (`npm run mcp:build`) and restart the
  client.

The bridge binds to `127.0.0.1` and accepts connections only from local origins
or the configured `SPARTITO_APP_URL` origin.

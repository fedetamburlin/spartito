# Architecture

Spartito is a **static, client-side compiler**: it turns a ChordPro source
into a one-page A4 PDF. There is no backend; the PDF is the portable
artifact and any PDF reader can display it.

## Data flow

```
ChordPro source
      │
      ▼
parseChordPro ──► SongDocument ──► transposedForDisplay ──► Page (HTML/CSS, mm)
      │                                                        │
      │                                                        ▼
      │                                             auto-fit (DOM measurement)
      │                                                        │
      ▼                                                        ▼
IndexedDB library                                    live preview / print CSS
      ▲                                                        │
      │                                                        ▼
      └── MCP client ◄── WebSocket bridge ◄── app state   Chrome "Save as PDF"
```

Import is the reverse direction for text and PDFs:

```
paste / .cho / PDF ──► importSong ──► canonical ChordPro ──► editor
```

## Module map

### `src/core` — pure logic (browser APIs only at the edges)

| Module                                  | Responsibility                                                |
| --------------------------------------- | ------------------------------------------------------------- |
| `config`                                | typed access to `config/defaults.json`                        |
| `model`                                 | `SongDocument` and section/item types                         |
| `chordpro`                              | parser, canonical serializer, capo values, unknown directives |
| `chords`                                | chord grammar, chord-line detection, chord/lyric merge        |
| `transpose`                             | non-destructive transposition and capo display                |
| `directives`                            | single source of truth for the supported ChordPro subset      |
| `fit`                                   | column/font cascade, auto-grow, overflow status               |
| `settings`                              | per-song settings and sanitization                            |
| `persistence`                           | legacy localStorage, JSON import/export, file names           |
| `db`                                    | tiny IndexedDB wrapper (`songs` + `meta`)                     |
| `library`                               | song entries, ordering, migration, selection                  |
| `import`                                | text/UG/PDF text → canonical ChordPro                         |
| `pdf`                                   | coordinate-based PDF text reconstruction                      |
| `deeplink`                              | base64url share links                                         |
| `bridge`                                | browser side of the MCP WebSocket protocol                    |
| `theme`, `zoom`, `timeout`, `highlight` | small focused helpers                                         |

Dependency direction: `config → model → parser/chords → transpose/import/fit
→ app`. `core` never imports from `ui`. The few modules that touch browser
APIs (`db`, `bridge`, `theme`) are still isolated and testable with fakes.

`src/core` stays flat on purpose. At ~20 cohesive modules a split into
subfolders adds import churn without making the boundary clearer. Revisit
when a domain grows past ~8 modules or the folder passes ~30 files.

### `src/ui` — Svelte 5 components and measurement

- `App.svelte` owns source, settings, library state and the MCP bridge.
- `EditorPane.svelte` owns the CodeMirror instance and the two-way binding.
- `PreviewPane.svelte` owns zoom and the auto-fit effect.
- `Page.svelte` renders the measured A4 page; `measure.ts` clones it for fitting.
- `Sidebar`, `Toolbar`, `InsertMenu`, `ChordProHelp`, `ImportDialog` are presentational.
- `styles/app.css` is the UI shell; `styles/paper.css` is the sheet and is the only CSS that affects the PDF.

### `packages/mcp` — local MCP server

Node workspace with tools (`get_song`, `set_song`, `update_settings`,
`export_pdf`), a WebSocket bridge on `127.0.0.1:7331`, stdio/HTTP transports
and a headless-Chrome PDF renderer. It shares the wire protocol with
`src/core/bridge.ts` but no app code.

## State and persistence

- Songs live in IndexedDB (`songs` store, `meta` store for active id and
  sidebar state). Writes are debounced in `App.svelte`.
- Values are JSON-cloned at the DB boundary: IndexedDB rejects Svelte 5
  proxies (`DataCloneError`).
- The single-song `localStorage` state from older versions is migrated once
  and kept as a backup.
- Share links (`#doc=…`) are ephemeral: no library, no saves; they exist for
  MCP PDF rendering and quick sharing.
- Theme preference is in `localStorage` and applied before first paint.

## Layout and PDF

- The page is A4 portrait in millimetres; margins default to 5 mm.
- Auto-fit measures a clone of the real page: 1 column → 2 columns → smaller
  font (6 pt lyrics / 5 pt chords), and grows short songs up to 14 pt.
- `@media print` hides the app chrome and prints only the page.
- Chrome/Chromium is the reference renderer. The PDF is the canonical
  artifact: export once and share that file instead of re-printing from
  another browser.

## Testing

Five layers: pure unit, invariants + seeded stress, data fixtures, browser
E2E, MCP. Details, conventions and the feature→test map are in
[`tests/README.md`](tests/README.md). Decisions are recorded in
[`docs/adr`](docs/adr).

## Build and deploy

Vite builds a static bundle into `dist/`; GitHub Actions runs check, unit
tests, lint, format check, MCP checks, Playwright and the build, then
publishes to GitHub Pages on `main`. The MCP server is built separately.

# Test suite

This folder is the executable specification of Spartito. The goal is not
"more tests": it is **confidence to change the parser, importer, layout and
UI without manual re-checks**, at a maintenance cost that a single
maintainer can afford.

## Running

| Command | What it does | Time |
|---|---|---|
| `npm test` | Unit + integration (Vitest) | ~3 s |
| `npm run test:e2e` | Build, then browser smoke tests (Playwright, Chromium) | ~20 s |
| `npm run mcp:test` | MCP server tests | ~1 s |
| `npm run check` / `mcp:check` | TypeScript + Svelte diagnostics | ~5 s |

First local E2E run: `npx playwright install chromium`.

## Layers

Each layer has a different job. Redundancy is intentional, but it is not the
same test copied five times.

| Layer | Files | Catches | Does not catch |
|---|---|---|---|
| 1. Pure unit | `chordpro`, `chords` (in `import.test`), `transpose`, `capo`, `fit`, `zoom`, `theme`, `highlight`, `settings` (in `invariants`) | Local logic errors | Errors between modules |
| 2. Invariants | `invariants`, `config`, `timeout`, `deeplink` | Contract errors, config drift, async edge cases | UI errors |
| 3. Data fixtures | `import`, `pdf`, `pdf-fixtures`, `local-import` | Real-world input shapes (UG markup, PDF coordinates) | User flows |
| 4. Browser E2E | `e2e/*.spec.ts` | Svelte ↔ CodeMirror ↔ IndexedDB ↔ print glue | Algorithm details |
| 5. MCP | `../packages/mcp/test` | Protocol, bridge, HTTP, tools | UI |

## Test map

| Feature | Where |
|---|---|
| Chord grammar, chord-above-lyrics merge | `import.test.ts` |
| ChordPro parser, directives, capo, chorus recall | `chordpro.test.ts`, `directives.test.ts` |
| Transposition, capo display | `transpose.test.ts`, `capo.test.ts`, `invariants.test.ts` |
| Layout, auto-fit, auto-grow | `fit.test.ts`, `invariants.test.ts`, `e2e/boot.spec.ts` |
| Import from text/UG/PDF | `import.test.ts`, `pdf.test.ts`, `pdf-fixtures.test.ts`, `local-import.test.ts`, `e2e/import.spec.ts` |
| Library, IndexedDB, legacy migration | `library.test.ts`, `db.test.ts` |
| Persistence, export filename | `persistence.test.ts`, `invariants.test.ts` |
| Settings sanitization | `invariants.test.ts`, `persistence.test.ts` |
| Theme, zoom | `theme.test.ts`, `zoom.test.ts` |
| Editor highlighting | `highlight.test.ts` |
| Bridge (app side) | `bridge.test.ts` |
| Share links | `deeplink.test.ts` |
| Library open timeout / blocked storage | `timeout.test.ts`, `e2e/fallback.spec.ts` |
| Print/PDF export | `e2e/pdf.spec.ts` |
| Editing, Insert menu, transpose shortcut, undo boundary | `e2e/editing.spec.ts` |
| Config coherence | `config.test.ts` |
| MCP tools/bridge/HTTP | `packages/mcp/test/*` |

## Conventions

- **A spec mirrors a module**: `transpose.test.ts` owns `transpose.ts`. If a
  test needs three modules, it belongs to an integration file.
- **One behaviour per `it`**; variants go in table-driven `it.each` with a
  descriptive name.
- **No clever helpers**: a little repetition is more readable than a test
  framework inside the test folder. Shared helpers live in
  `e2e/helpers.ts` only.
- **Deterministic**: inject time (`createSong(..., now)`), use fake timers,
  never `sleep`. E2E waits with `expect.poll` / locator assertions.
- **English** for test names and comments (the UI is English; `doc/` is
  Italian).
- **No snapshots** of HTML or PDFs. Assert semantic facts instead: title,
  capo, section count, page count, extracted text.

## Fixtures

Committed fixtures are **synthetic**: invented lyrics, public-domain text,
or generated PDFs. They must be small, reproducible and free of third-party
lyrics. See [`fixtures/README.md`](fixtures/README.md) for the catalogue.

### Adding a fixture

1. Add the smallest input that reproduces the shape you care about.
2. Give it a descriptive name (`import-…`, `generated-…`).
3. Document it in `fixtures/README.md`: origin, what it exercises, expected
   result.
4. Add a table-driven case in the owning spec.

### Real Ultimate Guitar corpus (local only)

The ten real pages live in `fixtures/local/ug/`, which is **gitignored**:
the text is copyrighted and must not be published. Only URLs and metadata
are committed in `fixtures/ug-sources.json`.

```bash
node tools/fetch-ug-fixtures.mjs          # download missing pages
node tools/fetch-ug-fixtures.mjs --force  # refresh everything
```

Then `npm test` runs `local-import.test.ts`; when the folder is missing the
suite is skipped. Invariants checked: no crash, no `[ch]`/`[tab]` leftovers,
no `Page 1/2`, capo/title when present, minimum merged chord lines and
section counts. CI never sees these files.

### PDF fixtures

```bash
node tests/fixtures/generate/make-pdfs.mjs
```

Requires Chrome/Chromium (`SPARTITO_CHROME_PATH` overrides). The script
writes five PDFs with invented lyrics: single column, two columns, noise,
misaligned chords and an image-only scan (no text layer). `pdf-fixtures.test.ts`
checks extraction and import; the E2E suite also imports the single-column
PDF through the real file input.

## CI

`deploy.yml` runs `check`, `test`, `mcp:check`, `mcp:test`, `mcp:build`,
then installs Chromium and runs the E2E suite before deploying. Playwright
browser downloads are cached; traces are uploaded on failure. The local UG
corpus is **not** part of CI by design.

## Deliberate non-goals

- Coverage thresholds (vanity metric; tests are chosen by risk).
- HTML snapshots and visual baselines (brittle, updated on every CSS tweak).
- jsdom/testing-library for every component (CodeMirror needs a real browser).
- Multi-browser E2E (the PDF target is Chromium; the UI is desktop-first).
- Fuzzing, mutation testing, performance assertions (flaky or low value here).

## Known limitations encoded in tests

- **Chord spelling**: `transposeDocument`/`transposeChord` round-trips are
  compared by **pitch class**, because a flat chord landing on a natural
  loses its flat preference (`Bb +1 → B`, then `B −1 → A#`). This is a known
  limitation, not a regression.
- **`fileBaseName`** strips non-Latin scripts and falls back to `song`.
- **`sanitizeSettings`** ignores `NaN`/`Infinity` instead of propagating them.

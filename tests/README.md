# Test suite

This folder is the executable specification of Spartito. The goal is not
"more tests": it is **confidence to change the parser, importer, layout and
UI without manual re-checks**, at a maintenance cost that a single
maintainer can afford.

## Running

| Command                                                                                       | What it does                                           | Time  |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----- |
| `npm test`                                                                                    | Unit + integration (Vitest)                            | ~3 s  |
| `npm run test:e2e`                                                                            | Build, then browser smoke tests (Playwright, Chromium) | ~20 s |
| `npm run test:e2e` + `CROSS_BROWSER=1 npx playwright test --project=firefox --project=webkit` | Firefox/WebKit smoke (install both browsers once)      | ~15 s |
| `npm run mcp:test`                                                                            | MCP server tests                                       | ~1 s  |
| `npm run check` / `mcp:check`                                                                 | TypeScript + Svelte diagnostics                        | ~5 s  |

First local E2E run: `npx playwright install chromium`.

## Layout

```
tests/
  unit/          pure modules (parser, fit, transpose, config, helpers)
  integration/   multi-module flows (import, PDF, library, DB, bridge)
  e2e/           Playwright browser specs + helpers
  helpers/       fixtures paths, semantic chords, text utilities
  fixtures/      committed synthetic fixtures + generated PDFs
```

## Layers

Each layer has a different job. Redundancy is intentional, but it is not the
same test copied five times.

| Layer                  | Files                                                                                                                           | Catches                                                       | Does not catch         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| 1. Pure unit           | `chordpro`, `chords` (in `import.test`), `transpose`, `capo`, `fit`, `zoom`, `theme`, `highlight`, `settings` (in `invariants`) | Local logic errors                                            | Errors between modules |
| 2. Invariants + stress | `invariants`, `config`, `timeout`, `deeplink`, `stress` (300 seeded songs + adversarial inputs)                                 | Contract errors, config drift, async edge cases, crash safety | UI errors              |
| 3. Data fixtures       | `import`, `pdf`, `pdf-fixtures`, `local-import`, `local-pdf`                                                                    | Real-world input shapes (UG markup, PDF coordinates)          | User flows             |
| 4. Browser E2E         | `e2e/*.spec.ts`                                                                                                                 | Svelte ↔ CodeMirror ↔ IndexedDB ↔ print glue                  | Algorithm details      |
| 5. MCP                 | `../packages/mcp/test`                                                                                                          | Protocol, bridge, HTTP, tools                                 | UI                     |

## Test map

| Feature                                                 | Where                                                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Chord grammar, chord-above-lyrics merge                 | `import.test.ts`                                                                                                           |
| ChordPro parser, directives, capo, chorus recall        | `chordpro.test.ts`, `directives.test.ts`                                                                                   |
| Transposition, capo display                             | `transpose.test.ts`, `capo.test.ts`, `invariants.test.ts`                                                                  |
| Layout, auto-fit, text ceiling                          | `fit.test.ts`, `invariants.test.ts`, `e2e/boot.spec.ts`                                                                    |
| Import from text/UG/PDF                                 | `import.test.ts`, `pdf.test.ts`, `pdf-fixtures.test.ts`, `local-import.test.ts`, `local-pdf.test.ts`, `e2e/import.spec.ts` |
| Library, IndexedDB, legacy migration                    | `library.test.ts`, `db.test.ts`                                                                                            |
| Persistence, export filename                            | `persistence.test.ts`, `invariants.test.ts`                                                                                |
| Settings sanitization                                   | `invariants.test.ts`, `persistence.test.ts`                                                                                |
| Theme, zoom                                             | `theme.test.ts`, `zoom.test.ts`                                                                                            |
| Editor highlighting                                     | `highlight.test.ts`                                                                                                        |
| Bridge (app side)                                       | `bridge.test.ts`                                                                                                           |
| Share links                                             | `deeplink.test.ts`                                                                                                         |
| Library open timeout / blocked storage                  | `timeout.test.ts`, `e2e/fallback.spec.ts`                                                                                  |
| Print/PDF export                                        | `e2e/pdf.spec.ts`                                                                                                          |
| Overflow print guard, PDF completeness                  | `e2e/overflow.spec.ts`                                                                                                     |
| Songbook selection and export                           | `songbook.test.ts`, `e2e/songbook.spec.ts`                                                                                 |
| Cross-browser smoke, tablet viewport                    | `e2e/cross-browser.spec.ts`                                                                                                |
| Editing, Insert menu, transpose shortcut, undo boundary | `e2e/editing.spec.ts`                                                                                                      |
| Config coherence                                        | `config.test.ts`                                                                                                           |
| Robustness: seeded songs, malformed input               | `stress.test.ts`                                                                                                           |
| MCP tools/bridge/HTTP                                   | `packages/mcp/test/*`                                                                                                      |

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

### Real-world corpus (local only)

The **20 real Ultimate Guitar pages** and **5 real PDFs** live in
`fixtures/local/`, which is **gitignored**: the text is copyrighted and must
not be published. Only URLs, metadata and checksums are committed in
`fixtures/ug-sources.json`, `fixtures/pdf-sources.json` and the generated
`fixtures/local/manifest.json`.

```bash
node scripts/fetch-fixtures.mjs                 # download what is missing
node scripts/fetch-fixtures.mjs --force         # refresh everything
node scripts/fetch-fixtures.mjs --only pdf      # one group
node scripts/fetch-fixtures.mjs --check         # verify checksums, no network
```

Then `npm test` runs `local-import.test.ts` and `local-pdf.test.ts`; when the
folders are missing the suites are skipped. Assertions are structural: no
`[ch]`/`[tab]` leftovers, no `Page 1/2`, title/capo when present, minimum
merged lines and sections, every chord valid, balanced sections, import
idempotence and ≥65% word retention. CI never sees these files.

### PDF fixtures

```bash
node scripts/make-pdf-fixtures.mjs
```

Requires Chrome/Chromium (`SPARTITO_CHROME_PATH` overrides) and, for the
encrypted fixture, Ghostscript. The script writes PDFs with invented
lyrics: single column, two columns, noise, misaligned chords, three-page
two-column songbook, rotated text, mixed text/image, hyphenated text, an
image-only scan and a password-protected file. `pdf-fixtures.test.ts` and
`pdf-torture.test.ts` check extraction and graceful failure; the E2E suite
also imports the single-column PDF through the real file input and checks
the alert for a corrupted file.

## CI

`deploy.yml` runs `check`, `test`, `mcp:check`, `mcp:test`, `mcp:build`,
then installs Chromium and runs the E2E suite before deploying. Playwright
browser downloads are cached; traces are uploaded on failure. The local
corpus is **not** part of CI by design.

## Deliberate non-goals

- Coverage thresholds (vanity metric; tests are chosen by risk).
- HTML snapshots and visual baselines (brittle, updated on every CSS tweak).
- jsdom/testing-library for every component (CodeMirror needs a real browser).
- Full multi-browser E2E (the PDF target is Chromium; a Firefox/WebKit smoke runs in CI).
- Unseeded fuzzing, mutation testing, performance assertions (flaky or low value here).

## Known limitations encoded in tests

- **Chord spelling**: `transposeDocument`/`transposeChord` round-trips are
  compared by **pitch class**, because a flat chord landing on a natural
  loses its flat preference (`Bb +1 → B`, then `B −1 → A#`). This is a known
  limitation, not a regression.
- **`fileBaseName`** strips non-Latin scripts and falls back to `song`.
- **`sanitizeSettings`** ignores `NaN`/`Infinity` instead of propagating them.

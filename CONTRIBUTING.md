# Contributing

Spartito is a static Svelte app with a small Node workspace for MCP. The PDF
is the product; the editor is the tool that produces it.

## Setup

- Node.js **22.12+** (Node 24+ is also supported; `.nvmrc` pins 22)
- `npm ci`
- `npx playwright install chromium` for browser tests

## Commands

| Command                                        | Meaning                                   |
| ---------------------------------------------- | ----------------------------------------- |
| `npm run dev`                                  | Vite dev server                           |
| `npm run build` / `preview`                    | production build / serve it               |
| `npm run check`                                | Svelte + TypeScript diagnostics           |
| `npm run lint`                                 | ESLint (correctness + Svelte a11y)        |
| `npm run format` / `format:check`              | Prettier                                  |
| `npm test`                                     | unit + integration (Vitest)               |
| `npm run test:e2e`                             | build + Playwright smoke suite            |
| `npm run fixtures:sync`                        | download the local-only real-world corpus |
| `npm run fixtures:check`                       | verify fixture checksums without network  |
| `npm run clean`                                | remove build/test artifacts               |
| `npm run mcp:build` / `mcp:check` / `mcp:test` | MCP workspace                             |

Before opening a pull request run:

```bash
npm run verify
```

That runs format check, lint, type check, unit tests, E2E, MCP checks and
the MCP build.

## Project layout

```
config/        project defaults and import dictionaries
public/fonts/  OFL fonts (Inter, IBM Plex Sans Condensed, JetBrains Mono) + licenses
src/core/      pure TS: config, model, db, library, backup, storage, chords,
               directives, chordpro, transpose, import, pdf, fit, highlight,
               persistence, settings, download
src/ui/        Svelte components, styles, measurement and focus management
packages/mcp/  local MCP server: tools, websocket bridge, stdio/HTTP transports, PDF export
tests/         unit/integration tests, fixtures, Playwright E2E (see tests/README.md)
scripts/       fixture downloaders and PDF fixture generator
docs/adr/      architecture decision records
```

## Pull requests

- Keep one concern per PR and link the issue it resolves.
- Add or update the test that would have caught the bug or would catch a
  regression in the new behaviour.
- Run `npm run verify` before requesting review.
- Note user-visible changes in `CHANGELOG.md` and update the README when
  behaviour or limitations change.
- UI changes must keep keyboard access and the dialog focus trap intact; run
  the accessibility E2E specs.
- Never commit third-party lyrics, real Ultimate Guitar pages or copyrighted
  PDFs. Use synthetic fixtures.

## Good first issues

Issues labelled **good first issue** are self-contained and have a known test
layer. Good candidates:

- a missing or misbehaving ChordPro directive with a small synthetic source;
- an import shape (text or PDF) that can be reduced to a fixture;
- a documentation or help-panel improvement;
- a small accessibility fix with a keyboard assertion;
- a focused UI polish with an existing E2E spec.

A good issue states the files involved, the expected behaviour, the acceptance
test and the command to run. If you want to work on one, comment on the issue
so nobody duplicates the effort. New contributors are welcome to ask for
guidance before writing code.

## Tests

The suite has five layers; read [`tests/README.md`](tests/README.md) for the
feature→test map and conventions. In short:

- **TDD for `src/core`**: pure modules, fast tests, no mocks unless the module
  wraps a browser API.
- **E2E for glue**: semantic assertions, no screenshots or baselines.
- **Fixtures**: committed ones are synthetic/generated/public domain. Real
  Ultimate Guitar pages and PDFs are local-only and gitignored; never commit
  third-party lyrics.
- **Regression tests** must be added for every bug fixed.

## Code style

- Prettier owns formatting; ESLint owns correctness and accessibility.
- TypeScript strict mode; no `any` unless the boundary is genuinely unknown.
- Svelte 5 runes only (`$state`, `$derived`, `$effect`, `$props`).
- One concern per commit; conventional commit prefixes (`feat:`, `fix:`,
  `test:`, `chore:`, `docs:`, `style:`, `ci:`).

## Branches and deployment

`main` deploys to GitHub Pages on every push. Work on a feature branch and
open a PR; CI runs check, lint, format check, unit tests, MCP tests and E2E
before deploying.

The release checklist, backup-format contract and Dependabot policy are in
[`MAINTAINING.md`](MAINTAINING.md).

## Adding a directive

`src/core/directives.ts` is the single registry: parser, Insert menu, help
panel and guard tests derive from it. Add the entry, add a case to
`tests/unit/directives.test.ts`, and verify the help panel still matches.

## Architecture

See [`ARCHITECTURE.md`](ARCHITECTURE.md) and the decision records in
[`docs/adr`](docs/adr).

# ADR 0001 — Third-party fixtures stay local

## Context

The importer must work on real Ultimate Guitar pages and real PDFs. Those
files contain copyrighted lyrics. The repository is public and MIT-licensed,
and the project rule is to never host third-party lyrics without a license.

## Decision

- Real pages and PDFs are downloaded by `scripts/fetch-fixtures.mjs` into
  `tests/fixtures/local/`, which is gitignored.
- Only URLs, structural metadata, expectations and SHA-256 checksums are
  committed (`*-sources.json`, `local/manifest.json`).
- Committed fixtures are synthetic, generated or public domain.
- Tests assert structure (title, capo, sections, chords, idempotence, word
  retention), never compare the lyrics.
- CI never downloads the corpus; the local suites skip when it is absent.

## Consequences

- Local runs get real-world coverage; CI and contributors do not.
- A source can disappear or change; `--check` detects drift and `--force`
  refreshes it.
- Adding a source is a documented two-file change (URL metadata + expectation).

## Alternatives considered

- Commit verbatim pages: rejected (DMCA risk on the whole repository).
- Only synthetic fixtures: rejected (misses format changes like UG's `[tab]`
  line wrappers, which had already broken the importer).

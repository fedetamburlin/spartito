# ADR 0002 — Semantic E2E, no visual baselines

## Context

The app renders a precise A4 sheet, but pixel-perfect screenshots across
browsers, OSes and font rasterisation are brittle: every CSS tweak requires
regenerating baselines, and failures are hard to interpret.

## Decision

- Browser tests use Playwright with semantic assertions: visible text,
  layout badge, page count, extracted PDF text, library state.
- No screenshot baselines, no visual diffing, no multi-browser matrix.
- Chromium only, because it is the reference PDF renderer.
- `page.pdf()` output is parsed with `unpdf` to assert real print results.

## Consequences

- The suite is fast (~7 s) and stable; it survives restyling.
- It cannot catch a subtle visual regression (spacing, colour) on its own.
  Those remain a manual check on the real tablet/desktop.
- New UI tests should assert user-visible behaviour, not DOM structure.

## Alternatives considered

- Playwright screenshots per viewport: rejected (maintenance cost, flaky).
- jsdom component tests: rejected (CodeMirror needs a real browser; the glue
  is what breaks).

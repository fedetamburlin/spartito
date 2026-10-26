# Changelog

## [1.0.0] - 2026-10-25

### Added

- Full library backups: a versioned JSON file with every song, its layout
  settings and the active song. Restore with merge (adds missing songs) or
  replace (swaps the whole library in one transaction).
- Persistent storage check on load and request after the first edit, with a
  sidebar warning when the browser only offers best-effort storage.
- Songbook cover overflow guard: the pre-print dialog now warns when the cover
  title list cannot fit on one page.
- Keyboard focus containment and focus restore for the Import, Songbook,
  restore and print-guard dialogs.
- `CODE_OF_CONDUCT.md`, `SECURITY.md`, pull request template and maintainer
  guide.

### Changed

- The restore confirmation is a dialog with explicit merge and replace actions.
- README documents backups, storage behavior and the 1.0 scope.

## [0.2.0] - 2026-10-25

### Added

- Open Graph and Twitter metadata plus a social preview image.
- Bug report and feature request issue templates.
- Browser support, limitations and feedback sections in the README.

### Changed

- Upgraded to Vite 8 and `@sveltejs/vite-plugin-svelte` 7.
- Upgraded to TypeScript 6.
- Node.js 22.12+ is now required; Node 24+ is supported.
- Songbook cover titles are listed in one column.

### Fixed

- The songbook overflow guard no longer appears in the printed PDF.

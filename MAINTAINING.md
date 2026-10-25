# Maintaining Spartito

Practical guide for the maintainer: releases, dependencies, data compatibility
and triage.

## Release checklist

1. `git switch main && git pull`
2. `npm ci`
3. `npm run verify` (format, lint, types, unit, E2E, MCP)
4. Bump `version` in `package.json`; update the root version in
   `package-lock.json` (`npm version X.Y.Z --no-git-tag-version` is fine).
5. Add the new version section at the top of `CHANGELOG.md` with the release
   date, keeping older entries intact.
6. Open a release PR, wait for CI, merge.
7. Tag and publish:

   ```bash
   git switch main && git pull
   git tag -a vX.Y.Z -m "Spartito vX.Y.Z"
   git push origin vX.Y.Z
   gh release create vX.Y.Z --title "Spartito vX.Y.Z" --notes-file /tmp/notes.md
   ```

8. Verify the live site: HTTP 200, editor and **Print PDF** present, OG image
   loads, no console errors. Download a backup and restore it once against the
   production build.
9. Announce only after the release page and live site are both verified.

## Versioning

- **Patch**: bug fixes with no behaviour change for stored data.
- **Minor**: features, additive backup fields, compatible UI changes.
- **Major**: breaking changes, including a backup format that cannot be read by
  older releases.

1.x promises that a library backup written by any 1.x release can be read by any
later 1.x release.

## Backup format contract

The library backup is documented in `src/core/backup.ts`:

```json
{
  "app": "spartito-app",
  "kind": "library",
  "schemaVersion": 1,
  "exportedAt": "2026-10-25T12:00:00.000Z",
  "activeId": "…",
  "songs": [{ "id": "…", "source": "…", "settings": {}, "createdAt": 0, "updatedAt": 0 }]
}
```

Rules:

- Additive fields are allowed within `schemaVersion: 1`; readers ignore unknown
  fields but sanitize known ones.
- Renaming, removing or changing the meaning of a field requires a new
  `schemaVersion`.
- A new reader must still accept the previous version, or the release notes
  must explain the migration and provide an export path.
- Never remove the single-song `localStorage` migration key; old installs may
  still need it.

## Dependency policy

- Dependabot runs every Monday for npm and GitHub Actions.
- Minor and patch updates are grouped into one PR; review the lockfile diff and
  let the full CI gate decide.
- Major updates are intentionally ignored for Vite, the Svelte Vite plugin,
  TypeScript and `@types/node`. They need a dedicated migration PR, not a
  Dependabot merge.
- Keep the runtime on an active LTS line. `.nvmrc` and CI choose the Node
  version; `engines` states the supported range.
- `npm audit` runs in CI for production dependencies. A clean audit is a
  requirement, not a reason to skip review.

## Data and storage

- Library writes use IndexedDB transactions. Merge uses one batched write;
  replace clears and writes in a single transaction.
- `navigator.storage.persist()` is requested on load. A denial is shown in the
  sidebar; do not hide it or promise durability.
- The backup is the user-facing recovery path. Any change to songs, settings or
  ordering must be reflected in `buildLibraryBackup`/`parseLibraryBackup` and in
  the backup tests.

## Triage

- Labels: `bug`, `feature`, `docs`, `accessibility`, `good first issue`.
- Reproduce with the reported browser and ChordPro source. Ask for a backup or
  a minimal source when the report is ambiguous.
- A good first issue names the files, expected behaviour, acceptance test and
  the command to run.
- Close issues that are out of scope with a short reason and point to the
  roadmap.

## Security and conduct

- Security reports follow [`SECURITY.md`](SECURITY.md).
- Community behavior follows [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
- Do not commit third-party lyrics, real Ultimate Guitar pages or copyrighted
  PDFs. The local corpus stays gitignored.

## Bus factor

The release steps above, the versioning rules and the backup contract are the
continuity plan. Keep `main` releasable at all times, keep CI green and tag every
release so an outside contributor can reconstruct what shipped.

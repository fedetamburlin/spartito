# ADR 0003 — Client-side PDF import

## Context

Users often have chord sheets as PDFs. A server-side parser would require an
upload endpoint, storage and a backend, contradicting the static/no-backend
architecture. Raw pdf.js text order is unreliable for chords above lyrics.

## Decision

- Import PDFs in the browser with `unpdf` (pdf.js), loaded dynamically only
  when the user selects a PDF.
- Reconstruct lines from text-item coordinates: group by `y`, order by `x`,
  rebuild spaces from gaps; split two-column pages before reading them.
- Always show the extracted text in the import dialog for review before it
  replaces the editor.
- Treat extraction as best effort: no OCR, clear alerts for scrambled or
  unreadable files, and tests for corrupted/encrypted/rotated inputs.

## Consequences

- No backend and no upload; the PDF never leaves the device.
- The pdf.js chunk (~1.6 MB) is lazy and does not affect app startup.
- Scanned PDFs without a text layer are rejected with an explanation.
- Coordinate heuristics can produce double spaces or misorder very unusual
  layouts; the review dialog is the safety valve.

## Alternatives considered

- Server-side extraction: rejected (backend, privacy, hosting cost).
- Naive `extractText` order: rejected (chords and lyrics interleave).
- OCR in the browser: rejected (large model, low accuracy on chord sheets).

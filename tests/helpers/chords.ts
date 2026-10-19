import { isChordToken } from '../../src/core/chords';
import type { SongDocument } from '../../src/core/model';

/** Every chord token in a parsed document that is not valid ChordPro. */
export function invalidChords(doc: SongDocument): string[] {
  const invalid: string[] = [];
  const check = (chord: string) => {
    if (!isChordToken(chord)) invalid.push(chord);
  };
  for (const block of doc.blocks) {
    if (block.kind !== 'section') continue;
    for (const item of block.items) {
      if (item.kind === 'line') item.words.forEach((word) => word.chords.forEach(check));
      if (item.kind === 'grid') item.chords.forEach(check);
      if (item.kind === 'grid-block') {
        item.rows.forEach((row) =>
          row.forEach((token) => {
            if (token.kind === 'chord') check(token.chord);
          })
        );
      }
    }
  }
  return invalid;
}

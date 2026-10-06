import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractPdfText,
  itemsToLines,
  itemsToText,
  splitColumns,
  type PdfTextItem
} from '../src/core/pdf';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

const item = (str: string, x: number, y: number, width?: number, height = 10): PdfTextItem => ({
  str,
  x,
  y,
  width: width ?? str.length * 5,
  height
});

const squeeze = (text: string) => text.replace(/\s+/g, ' ').trim();

describe('itemsToLines', () => {
  it('ricostruisce una riga di accordi sopra il testo', () => {
    const lines = itemsToLines([
      item('G', 100, 100),
      item('C', 0, 100),
      item('tonight', 70, 88),
      item('Walking', 0, 88),
      item('home', 40, 88)
    ]);
    expect(lines).toHaveLength(2);
    expect(squeeze(lines[0])).toBe('C G');
    expect(squeeze(lines[1])).toBe('Walking home tonight');
  });

  it('mantiene la distanza orizzontale tra gli accordi', () => {
    const lines = itemsToLines([item('Em', 0, 100), item('D', 150, 100)]);
    expect(lines[0]).toBe(`Em${' '.repeat(50)}D`);
  });

  it('unisce item con piccole differenze di y', () => {
    const lines = itemsToLines([item('C', 0, 100), item('G', 100, 99.5)]);
    expect(lines).toHaveLength(1);
    expect(squeeze(lines[0])).toBe('C G');
  });

  it('ignora item vuoti o senza contenuto', () => {
    expect(itemsToLines([])).toEqual([]);
    expect(itemsToLines([item('   ', 0, 10)])).toEqual([]);
  });
});

describe('extractPdfText', () => {
  it('estrae il testo e non consuma il buffer di input', async () => {
    const file = readFileSync(join(fixturesDir, 'mini.pdf'));
    const buffer = file.buffer.slice(
      file.byteOffset,
      file.byteOffset + file.byteLength
    ) as ArrayBuffer;
    const first = await extractPdfText(buffer);
    expect(first.pages).toBe(1);
    expect(first.hasText).toBe(true);
    expect(first.text.replace(/\s+/g, ' ').trim()).toBe('C G Am Hello world');
    const second = await extractPdfText(buffer);
    expect(second.text).toBe(first.text);
  });
});

describe('splitColumns', () => {
  it('separa due colonne e le legge in ordine', () => {
    const items = [
      item('Intro]', 0, 200, 30),
      item('Em', 0, 180),
      item('E', 300, 200),
      item('AMaj7', 310, 200, 25),
      item('In', 300, 180)
    ];
    expect(splitColumns(items)).toHaveLength(2);
    expect(itemsToText(items).split('\n').map(squeeze)).toEqual(['Intro]', 'Em', 'E AMaj7', 'In']);
  });

  it('non divide una colonna singola attraversata dal testo', () => {
    const items = [item('a long lyric line', 0, 100, 400), item('C', 0, 88)];
    expect(splitColumns(items)).toHaveLength(1);
  });
});

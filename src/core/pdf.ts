export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfExtractResult {
  text: string;
  pages: number;
  hasText: boolean;
}

function usableItems(items: PdfTextItem[]): PdfTextItem[] {
  return items.filter((item) => item.str.trim().length > 0);
}

export function splitColumns(items: PdfTextItem[]): PdfTextItem[][] {
  const usable = usableItems(items);
  if (usable.length === 0) return [];

  const pageEnd = Math.max(...usable.map((item) => item.x + item.width));
  const center = pageEnd / 2;
  const band = pageEnd * 0.02;
  const crosses = usable.some(
    (item) => item.x < center - band && item.x + item.width > center + band
  );
  if (crosses) return [usable];

  const left = usable.filter((item) => item.x + item.width <= center + band);
  const right = usable.filter((item) => item.x >= center - band);
  if (left.length === 0 || right.length === 0) return [usable];
  return [left, right];
}

export function itemsToLines(items: PdfTextItem[]): string[] {
  const usable = usableItems(items);
  if (usable.length === 0) return [];

  const heights = usable.map((item) => item.height).sort((a, b) => a - b);
  const tolerance = Math.max(1, heights[Math.floor(heights.length / 2)] * 0.45);

  const sorted = [...usable].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; items: PdfTextItem[] }[] = [];
  for (const item of sorted) {
    const current = lines[lines.length - 1];
    if (current && Math.abs(current.y - item.y) <= tolerance) {
      current.items.push(item);
    } else {
      lines.push({ y: item.y, items: [item] });
    }
  }

  return lines.map(({ items: lineItems }) => {
    const ordered = [...lineItems].sort((a, b) => a.x - b.x);
    let text = '';
    let prevEnd: number | null = null;
    for (const item of ordered) {
      const fontSize = item.height || 10;
      const spaceWidth = fontSize * 0.28;
      if (prevEnd !== null) {
        const gap = item.x - prevEnd;
        if (gap >= spaceWidth * 0.4) {
          text += ' '.repeat(Math.min(60, Math.max(1, Math.round(gap / spaceWidth))));
        }
      }
      text += item.str;
      prevEnd = item.x + item.width;
    }
    return text.trimEnd();
  });
}

export function itemsToText(items: PdfTextItem[]): string {
  return splitColumns(items)
    .map((column) => itemsToLines(column).join('\n'))
    .join('\n');
}

export async function extractPdfText(data: ArrayBuffer): Promise<PdfExtractResult> {
  const { extractTextItems, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(data.slice(0)));
  const { totalPages, items } = await extractTextItems(pdf);
  const text = items
    .map((pageItems) => itemsToText(pageItems as PdfTextItem[]))
    .join('\n\n')
    .trim();
  return { text, pages: totalPages, hasText: text.length > 0 };
}

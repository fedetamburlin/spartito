import type { LayoutParams, Measure } from '../core/fit';

export function createMeasure(pageEl: HTMLElement): Measure {
  return (params: LayoutParams): boolean => {
    const clone = pageEl.cloneNode(true) as HTMLElement;
    clone.classList.add('measuring-clone');
    clone.classList.toggle('columns-2', params.columns === 2);
    clone.classList.toggle('columns-1', params.columns !== 2);
    clone.style.setProperty('--text-pt', `${params.textPt}pt`);
    clone.style.setProperty('--chord-pt', `${params.chordPt}pt`);
    document.body.appendChild(clone);

    const content = clone.querySelector<HTMLElement>('.content');
    if (!content) {
      clone.remove();
      return false;
    }

    const overflow =
      content.scrollWidth > content.clientWidth + 1 ||
      content.scrollHeight > content.clientHeight + 1;

    clone.remove();
    return overflow;
  };
}

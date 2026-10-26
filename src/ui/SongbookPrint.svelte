<script lang="ts">
  import { untrack } from 'svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import { fontStack } from '../core/config';
  import type { FitOutcome } from '../core/fit';
  import type { SongbookDraft, SongbookPage } from '../core/songbook';
  import { defaultSettings } from '../core/settings';
  import FittedPage from './FittedPage.svelte';

  /**
   * The hidden print layout of a songbook: one sheet per song, in the order
   * picked in the dialog. It is the only thing visible when the book is
   * printed; the app itself is hidden by the print stylesheet.
   */

  interface Props {
    draft: SongbookDraft;
    pages: SongbookPage[];
    /** Every sheet has been laid out: safe to open the print dialog. */
    onReady: () => void;
    /** Some sheets cannot fit: let the app ask before printing. */
    onOverflow: (titles: string[]) => void;
    /** The print dialog is closed (printed or cancelled). */
    onDone: () => void;
  }

  let { draft, pages, onReady, onOverflow, onDone }: Props = $props();

  const fitted = new SvelteSet<string>();
  const overflowTitles = new SvelteMap<string, string>();
  let coverEl = $state<HTMLElement | null>(null);
  let coverContentEl = $state<HTMLElement | null>(null);
  let finishing = false;

  const coverDefaults = defaultSettings();
  const coverStyle = [
    `--page-margin: 18mm`,
    `--font-family: ${fontStack(coverDefaults.fontId)}`,
    `--text-color: ${coverDefaults.textColor}`,
    `--chord-color: ${coverDefaults.chordColor}`,
    `--comment-color: ${coverDefaults.commentColor}`
  ].join('; ');

  /**
   * The cover is a fixed A4 page with a centered title and list. Measure the
   * actual span from the heading to the last title: if it exceeds the page
   * content box, the list would spill onto another sheet or be clipped.
   */
  function coverOverflows(): boolean {
    const page = coverEl;
    const content = coverContentEl;
    if (!page || !content) return false;
    const heading = content.querySelector('h1');
    const list = content.querySelector('ol');
    if (!heading || !list) return false;
    const style = getComputedStyle(page);
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
    const available = page.clientHeight - paddingTop - paddingBottom;
    const contentHeight = list.getBoundingClientRect().bottom - heading.getBoundingClientRect().top;
    return contentHeight > available + 1;
  }

  function finish(extraTitles: string[] = []) {
    if (finishing) return;
    finishing = true;
    // Fonts and layout settle before the dialog opens: what is measured is
    // what gets printed.
    void document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        const titles = [...extraTitles, ...overflowTitles.values()];
        if (draft.cover && coverOverflows()) titles.push('Cover page (too many titles)');
        if (titles.length > 0) onOverflow(titles);
        else onReady();
      });
    });
  }

  $effect(() => {
    document.body.dataset.printMode = 'book';
    return () => {
      delete document.body.dataset.printMode;
    };
  });

  $effect(() => {
    if (pages.length > 0) return;
    untrack(() => onDone());
  });

  function handleFit(id: string, outcome: FitOutcome) {
    if (outcome.status === 'overflow') {
      const page = pages.find((item) => item.id === id);
      if (page) overflowTitles.set(id, page.title);
    }
    fitted.add(id);
    if (fitted.size < pages.length) return;
    finish();
  }

  // Safety net: if a sheet never reports its fit (slow layout, broken
  // measurement, exotic browser), ask before printing instead of silently
  // cutting content off.
  $effect(() => {
    if (pages.length === 0) return;
    const timer = setTimeout(() => {
      if (finishing) return;
      const pending = pages.filter((page) => !fitted.has(page.id)).map((page) => page.title);
      finish(pending);
    }, 5000);
    return () => clearTimeout(timer);
  });
</script>

<svelte:window onafterprint={onDone} />

<div class="songbook">
  {#if draft.cover}
    <div class="songbook-item">
      <div class="page songbook-cover" style={coverStyle} bind:this={coverEl}>
        <div class="songbook-cover-content" bind:this={coverContentEl}>
          <h1>Songbook</h1>
          <ol>
            {#each pages as page (page.id)}<li>{page.title}</li>{/each}
          </ol>
        </div>
      </div>
    </div>
  {/if}
  {#each pages as page, index (page.id)}
    <div class="songbook-item" class:last={index === pages.length - 1}>
      <FittedPage
        doc={page.doc}
        settings={page.settings}
        capo={page.capo}
        onFit={(outcome) => handleFit(page.id, outcome)}
      />
    </div>
  {/each}
</div>

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
  let printing = false;

  const coverDefaults = defaultSettings();
  const coverStyle = [
    `--page-margin: 18mm`,
    `--font-family: ${fontStack(coverDefaults.fontId)}`,
    `--text-color: ${coverDefaults.textColor}`,
    `--chord-color: ${coverDefaults.chordColor}`,
    `--comment-color: ${coverDefaults.commentColor}`
  ].join('; ');

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
    if (printing || fitted.size < pages.length) return;
    printing = true;
    // Fonts and layout settle before the dialog opens: what is measured is
    // what gets printed.
    void document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        if (overflowTitles.size > 0) onOverflow([...overflowTitles.values()]);
        else onReady();
      });
    });
  }

  // Safety net: if a sheet never reports its fit (broken measurement, exotic
  // browser), print whatever is laid out instead of leaving the export stuck.
  $effect(() => {
    if (pages.length === 0) return;
    const timer = setTimeout(() => {
      if (printing) return;
      printing = true;
      onReady();
    }, 5000);
    return () => clearTimeout(timer);
  });
</script>

<svelte:window onafterprint={onDone} />

<div class="songbook">
  {#if draft.cover}
    <div class="songbook-item">
      <div class="page songbook-cover" style={coverStyle}>
        <h1>Songbook</h1>
        <ol>
          {#each pages as page (page.id)}<li>{page.title}</li>{/each}
        </ol>
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

<script lang="ts">
  import { untrack } from 'svelte';
  import { config } from '../core/config';
  import { decideLayout, type FitOutcome, type LayoutParams } from '../core/fit';
  import type { SongDocument } from '../core/model';
  import type { SongSettings } from '../core/settings';
  import { createMeasure } from './measure';
  import Page from './Page.svelte';

  /**
   * A sheet with its layout decided by the same auto-fit used in the preview:
   * one column -> two columns -> smaller type. Renders nothing but the page.
   */

  interface Props {
    doc: SongDocument;
    settings: SongSettings;
    capo?: number;
    /** Reports every layout decision, for status badges and print readiness. */
    onFit?: (outcome: FitOutcome) => void;
  }

  let { doc, settings, capo = 0, onFit }: Props = $props();

  let wrapEl = $state<HTMLElement | null>(null);
  let fontsReady = $state(false);
  let layout = $state<LayoutParams>({
    columns: config.layout.columnsDefault,
    textPt: config.layout.textPtDefault,
    chordPt: config.layout.chordPtDefault
  });

  $effect(() => {
    document.fonts.ready.then(() => {
      fontsReady = true;
    });
  });

  $effect(() => {
    const el = wrapEl;
    const currentDoc = doc;
    const currentSettings = settings;
    const ready = fontsReady;
    if (!el || !ready || !currentDoc) return;

    const frame = requestAnimationFrame(() => {
      const page = el.querySelector<HTMLElement>('.page');
      if (!page) return;
      const result = decideLayout(createMeasure(page), config, {
        columns: currentSettings.columns,
        textPt: currentSettings.textPt,
        allowGrow: config.layout.autoGrow
      });
      layout = result.params;
      // The callback must not re-run the measurement when the parent re-renders.
      untrack(() => onFit?.(result));
    });
    return () => cancelAnimationFrame(frame);
  });
</script>

<div class="fit-wrap" bind:this={wrapEl}>
  <Page {doc} {layout} {settings} {capo} />
</div>

<script lang="ts">
  import { config } from '../core/config';
  import { decideLayout, type FitOutcome, type LayoutParams } from '../core/fit';
  import type { SongDocument } from '../core/model';
  import type { SongSettings } from '../core/settings';
  import { createMeasure } from './measure';
  import Page from './Page.svelte';

  interface Props {
    doc: SongDocument;
    settings: SongSettings;
  }

  let { doc, settings }: Props = $props();

  let wrapEl = $state<HTMLElement | null>(null);
  let layout = $state<LayoutParams>({
    columns: config.layout.columnsDefault,
    textPt: config.layout.textPtDefault,
    chordPt: config.layout.chordPtDefault
  });
  let outcome = $state<FitOutcome | null>(null);
  let fontsReady = $state(false);

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
      const measure = createMeasure(page);
      const result = decideLayout(measure, config, {
        columns: currentSettings.columns,
        textPt: currentSettings.textPt
      });
      layout = result.params;
      outcome = result;
    });
    return () => cancelAnimationFrame(frame);
  });

  const statusText = $derived.by(() => {
    if (!outcome) return 'Calcolo impaginazione...';
    const columns = outcome.params.columns === 2 ? '2 colonne' : '1 colonna';
    switch (outcome.status) {
      case 'fits':
        return `${columns} · ${outcome.params.textPt}pt`;
      case 'columns':
        return `${columns} · ${outcome.params.textPt}pt (auto)`;
      case 'shrunk':
        return `${columns} · ${outcome.params.textPt}pt (ridotto)`;
      case 'overflow':
        return 'Non entra in una pagina: riduci il testo o scegli 2 colonne';
    }
  });
</script>

<div class="preview">
  <div class="preview-meta" class:warning={outcome?.status === 'overflow'}>
    <span class="badge">{statusText}</span>
    <span class="hint">Stampa → Salva come PDF · margini "predefiniti" · intestazioni disattivate</span>
  </div>
  <div class="preview-scroll">
    <div class="preview-wrap" bind:this={wrapEl}>
      <Page {doc} {layout} {settings} />
    </div>
  </div>
</div>

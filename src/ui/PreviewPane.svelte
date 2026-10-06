<script lang="ts">
  import { config } from '../core/config';
  import { decideLayout, type FitOutcome, type LayoutParams } from '../core/fit';
  import type { SongDocument } from '../core/model';
  import type { SongSettings } from '../core/settings';
  import { stepZoom, ZOOM_MAX, ZOOM_MIN } from '../core/zoom';
  import { createMeasure } from './measure';
  import Page from './Page.svelte';

  interface Props {
    doc: SongDocument;
    capo: number;
    settings: SongSettings;
  }

  let { doc, capo, settings }: Props = $props();

  let wrapEl = $state<HTMLElement | null>(null);
  let scrollEl = $state<HTMLElement | null>(null);
  let zoom = $state(1);
  let zoomPct = $derived(Math.round(zoom * 100));
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

  $effect(() => {
    const el = scrollEl;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoom = stepZoom(zoom, event.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const statusText = $derived.by(() => {
    if (!outcome) return 'Calculating layout...';
    const columns = outcome.params.columns === 2 ? '2 columns' : '1 column';
    switch (outcome.status) {
      case 'fits':
        return `${columns} · ${outcome.params.textPt}pt`;
      case 'columns':
        return `${columns} · ${outcome.params.textPt}pt (auto)`;
      case 'shrunk':
        return `${columns} · ${outcome.params.textPt}pt (shrunk)`;
      case 'overflow':
        return 'Does not fit on one page: reduce the text size or pick 2 columns';
    }
  });

  const showMeta = $derived(
    outcome !== null &&
      (outcome.status !== 'fits' ||
        outcome.params.columns !== 1 ||
        outcome.params.textPt !== config.layout.textPtDefault)
  );
</script>

<div class="preview">
  {#if showMeta}
    <div class="preview-meta" class:warning={outcome?.status === 'overflow'}>
      <span class="badge">{statusText}</span>
    </div>
  {/if}
  <div class="preview-scroll" bind:this={scrollEl}>
    <div
      class="preview-wrap"
      bind:this={wrapEl}
      style={`--zoom: ${zoom}; --page-w: ${config.page.widthMm}mm; --page-h: ${config.page.heightMm}mm`}
    >
      <div class="zoom-layer">
        <Page {doc} {layout} {settings} {capo} />
      </div>
    </div>
  </div>
  <div class="zoom-controls">
    <button
      type="button"
      aria-label="Zoom out"
      title="Zoom out"
      disabled={zoom <= ZOOM_MIN}
      onclick={() => (zoom = stepZoom(zoom, -1))}>−</button>
    <button
      type="button"
      class="zoom-value"
      title="Reset zoom to 100%"
      onclick={() => (zoom = 1)}>{zoomPct}%</button>
    <button
      type="button"
      aria-label="Zoom in"
      title="Zoom in"
      disabled={zoom >= ZOOM_MAX}
      onclick={() => (zoom = stepZoom(zoom, 1))}>+</button>
  </div>
</div>

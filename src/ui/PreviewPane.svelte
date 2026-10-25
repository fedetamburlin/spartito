<script lang="ts">
  import { config } from '../core/config';
  import { unknownDirectives } from '../core/chordpro';
  import type { FitOutcome, FitStatus } from '../core/fit';
  import type { SongDocument } from '../core/model';
  import type { SongSettings } from '../core/settings';
  import { stepZoom, ZOOM_MAX, ZOOM_MIN } from '../core/zoom';
  import FittedPage from './FittedPage.svelte';

  interface Props {
    doc: SongDocument;
    capo: number;
    settings: SongSettings;
    /** Largest size that fits, used to cap the manual text input. */
    onLimit?: (maxTextPt: number) => void;
    /** Current fit result, used to guard printing. */
    onStatus?: (status: FitStatus) => void;
  }

  let { doc, capo, settings, onLimit, onStatus }: Props = $props();

  let scrollEl = $state<HTMLElement | null>(null);
  let zoom = $state(1);
  let zoomPct = $derived(Math.round(zoom * 100));
  let outcome = $state<FitOutcome | null>(null);

  function handleFit(next: FitOutcome) {
    outcome = next;
    onLimit?.(next.maxTextPt);
    onStatus?.(next.status);
  }

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
        return 'Does not fit on one page; printing will cut off the remaining lines';
    }
  });

  const showMeta = $derived(
    outcome !== null &&
      (outcome.status !== 'fits' ||
        outcome.params.columns !== 1 ||
        outcome.params.textPt !== config.layout.textPtDefault)
  );

  const unknowns = $derived(unknownDirectives(doc));
</script>

<div class="preview" data-fit-status={outcome?.status ?? 'pending'}>
  {#if showMeta || unknowns.length > 0}
    <div class="preview-meta" class:warning={outcome?.status === 'overflow'}>
      {#if showMeta}
        <span class="badge">{statusText}</span>
      {/if}
      {#if unknowns.length > 0}
        <span class="badge unknown" title={unknowns.join('\n')}>
          ⚠ {unknowns.length} unknown directive{unknowns.length === 1 ? '' : 's'}
        </span>
      {/if}
    </div>
  {/if}
  <div class="preview-scroll" bind:this={scrollEl}>
    <div
      class="preview-wrap"
      style={`--zoom: ${zoom}; --page-w: ${config.page.widthMm}mm; --page-h: ${config.page.heightMm}mm`}
    >
      <div class="zoom-layer">
        <FittedPage {doc} {settings} {capo} onFit={handleFit} />
      </div>
    </div>
  </div>
  <div class="zoom-controls">
    <button
      type="button"
      aria-label="Zoom out"
      title="Zoom out"
      disabled={zoom <= ZOOM_MIN}
      onclick={() => (zoom = stepZoom(zoom, -1))}>−</button
    >
    <button type="button" class="zoom-value" title="Reset zoom to 100%" onclick={() => (zoom = 1)}
      >{zoomPct}%</button
    >
    <button
      type="button"
      aria-label="Zoom in"
      title="Zoom in"
      disabled={zoom >= ZOOM_MAX}
      onclick={() => (zoom = stepZoom(zoom, 1))}>+</button
    >
  </div>
</div>

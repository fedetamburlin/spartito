<script lang="ts">
  import { untrack } from 'svelte';
  import { importSong, type ImportResult } from '../core/import';

  interface Props {
    onApply: (source: string) => void;
    onClose: () => void;
    initialText?: string;
    title?: string;
    hint?: string;
  }

  let { onApply, onClose, initialText = '', title = 'Paste text', hint }: Props = $props();

  let raw = $state(untrack(() => initialText));
  let result = $state<ImportResult | null>(
    untrack(() => (initialText.trim() ? importSong(initialText) : null))
  );

  const summary = $derived.by(() => {
    if (!result) return '';
    const { merged, grids, sections, comments, tabs } = result.stats;
    return [
      merged ? `${merged} merged rows` : '',
      grids ? `${grids} chord-only lines` : '',
      sections ? `${sections} sections` : '',
      comments ? `${comments} comments` : '',
      tabs ? `${tabs} tab blocks` : ''
    ]
      .filter(Boolean)
      .join(' · ');
  });

  function convert() {
    result = raw.trim() ? importSong(raw) : null;
  }

  async function pasteFromClipboard() {
    try {
      raw = await navigator.clipboard.readText();
      result = null;
    } catch {
      // permission denied: the user pastes manually
    }
  }

  function apply() {
    if (!result) return;
    onApply(result.chordpro);
    onClose();
  }
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onClose()} />

<div class="modal-backdrop">
  <div class="modal" role="dialog" aria-modal="true" tabindex="-1">
    <h2>{title}</h2>
    <p class="hint">
      {#if hint}
        {hint}
      {:else}
        Paste from <a href="https://www.ultimate-guitar.com" target="_blank" rel="noopener"
          >Ultimate Guitar</a
        > or any chord site — chords, sections and metadata are converted automatically.
      {/if}
    </p>
    <textarea
      bind:value={raw}
      oninput={() => (result = null)}
      spellcheck="false"
      placeholder="Paste the copied text here…"></textarea>
    {#if result}
      <div class="summary">
        {#if summary}<div>{summary}</div>{/if}
        {#if result.warnings.length > 0}
          <ul>
            {#each result.warnings as warning, warningIndex (warningIndex)}<li>{warning}</li>{/each}
          </ul>
        {/if}
      </div>
      <div class="preview">{result.chordpro}</div>
    {/if}
    <footer>
      <button onclick={pasteFromClipboard}>Paste from clipboard</button>
      <span class="spacer"></span>
      <button onclick={onClose}>Cancel</button>
      <button onclick={convert} disabled={!raw.trim()}>Convert</button>
      <button class="primary" onclick={apply} disabled={!result}>Replace in editor</button>
    </footer>
  </div>
</div>

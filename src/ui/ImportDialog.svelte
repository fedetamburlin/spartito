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

  let {
    onApply,
    onClose,
    initialText = '',
    title = 'Incolla testo',
    hint = 'Incolla accordi e testo copiati da un sito (Ultimate Guitar, Accordi e Spartiti, …) o direttamente in ChordPro: la conversione è automatica.'
  }: Props = $props();

  let raw = $state(untrack(() => initialText));
  let result = $state<ImportResult | null>(
    untrack(() => (initialText.trim() ? importSong(initialText) : null))
  );

  const summary = $derived.by(() => {
    if (!result) return '';
    const { merged, grids, sections, comments } = result.stats;
    return [
      merged ? `${merged} righe unite` : '',
      grids ? `${grids} righe di soli accordi` : '',
      sections ? `${sections} sezioni` : '',
      comments ? `${comments} commenti` : ''
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
    <p class="hint">{hint}</p>
    <textarea
      bind:value={raw}
      oninput={() => (result = null)}
      spellcheck="false"
      placeholder="Incolla qui il testo copiato…"
    ></textarea>
    {#if result}
      <div class="summary">
        {#if summary}<div>{summary}</div>{/if}
        {#if result.warnings.length > 0}
          <ul>
            {#each result.warnings as warning}<li>{warning}</li>{/each}
          </ul>
        {/if}
      </div>
      <div class="preview">{result.chordpro}</div>
    {/if}
    <footer>
      <button onclick={pasteFromClipboard}>Incolla dagli appunti</button>
      <span class="spacer"></span>
      <button onclick={onClose}>Annulla</button>
      <button onclick={convert} disabled={!raw.trim()}>Converti</button>
      <button class="primary" onclick={apply} disabled={!result}>Sostituisci nell'editor</button>
    </footer>
  </div>
</div>

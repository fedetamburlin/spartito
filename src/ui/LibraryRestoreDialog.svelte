<script lang="ts">
  import { trapFocus } from './focus';

  interface Props {
    filename: string;
    songCount: number;
    exportedAt: string;
    busy?: boolean;
    error?: string | null;
    onMerge: () => void;
    onReplace: () => void;
    onClose: () => void;
  }

  let {
    filename,
    songCount,
    exportedAt,
    busy = false,
    error = null,
    onMerge,
    onReplace,
    onClose
  }: Props = $props();

  const exported = $derived.by(() => {
    const date = new Date(exportedAt);
    return Number.isNaN(date.getTime()) || date.getTime() === 0
      ? 'unknown date'
      : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  });

  function close() {
    if (!busy) onClose();
  }
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && close()} />

<div class="modal-backdrop">
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="restore-title"
    tabindex="-1"
    use:trapFocus
  >
    <h2 id="restore-title">Restore library</h2>
    <p class="hint">
      <strong>{filename}</strong>
      — {songCount} song{songCount === 1 ? '' : 's'}, exported {exported}.
    </p>
    <p class="hint">
      <strong>Merge</strong> keeps the current songs and adds the missing ones.
      <strong>Replace</strong> deletes the current library before restoring this backup.
    </p>
    {#if error}
      <p class="modal-error" role="alert">{error}</p>
    {/if}
    <footer>
      <button data-autofocus disabled={busy} onclick={close}>Cancel</button>
      <span class="spacer"></span>
      <button disabled={busy} onclick={onMerge}>Merge</button>
      <button class="btn-danger" disabled={busy} onclick={onReplace}>
        {busy ? 'Restoring…' : 'Replace library'}
      </button>
    </footer>
  </div>
</div>

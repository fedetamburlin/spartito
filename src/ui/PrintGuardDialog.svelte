<script lang="ts">
  import { trapFocus } from './focus';

  interface Props {
    title: string;
    message: string;
    details?: string[];
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let {
    title,
    message,
    details = [],
    confirmLabel = 'Print anyway',
    onConfirm,
    onCancel
  }: Props = $props();
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onCancel()} />

<div class="modal-backdrop">
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="print-guard-title"
    tabindex="-1"
    use:trapFocus={{ fallbackSelector: '[data-print-trigger]' }}
  >
    <h2 id="print-guard-title">{title}</h2>
    <p class="hint">{message}</p>
    {#if details.length > 0}
      <div class="summary">
        <ul>
          {#each details as detail, index (index)}<li>{detail}</li>{/each}
        </ul>
      </div>
    {/if}
    <footer>
      <span class="spacer"></span>
      <button data-autofocus onclick={onCancel}>Cancel</button>
      <button class="primary" onclick={onConfirm}>{confirmLabel}</button>
    </footer>
  </div>
</div>

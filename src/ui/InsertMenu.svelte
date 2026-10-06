<script lang="ts">
  import { SNIPPETS, type SnippetId } from '../core/snippets';

  interface Props {
    onInsert: (id: SnippetId) => void;
  }

  let { onInsert }: Props = $props();

  let open = $state(false);
  let root = $state<HTMLElement | null>(null);
  let button = $state<HTMLButtonElement | null>(null);

  function choose(id: SnippetId) {
    open = false;
    onInsert(id);
  }

  function onWindowClick(event: MouseEvent) {
    if (!open) return;
    if (root && event.target instanceof Node && root.contains(event.target)) return;
    open = false;
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      open = false;
      button?.focus();
    }
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<span class="insert" bind:this={root}>
  <button
    class="insert-toggle"
    type="button"
    aria-haspopup="menu"
    aria-expanded={open}
    title="Insert a ChordPro snippet"
    bind:this={button}
    onclick={() => (open = !open)}
  >
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
      <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    </svg>
    Insert
  </button>

  {#if open}
    <div class="insert-menu" role="menu">
      {#each SNIPPETS as snippet}
        <button
          type="button"
          role="menuitem"
          title={snippet.title}
          onclick={() => choose(snippet.id)}>{snippet.label}</button
        >
      {/each}
    </div>
  {/if}
</span>

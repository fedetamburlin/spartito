<script lang="ts">
  import { DIRECTIVE_GROUPS, DIRECTIVES } from '../core/directives';

  interface Props {
    onInsert: (id: string) => void;
  }

  let { onInsert }: Props = $props();

  let open = $state(false);
  let root = $state<HTMLElement | null>(null);
  let button = $state<HTMLButtonElement | null>(null);

  const groups = DIRECTIVE_GROUPS.filter((group) => group.menu).map((group) => ({
    ...group,
    items: DIRECTIVES.filter((directive) => directive.group === group.id)
  }));

  function choose(id: string) {
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
      {#each groups as group (group.id)}
        <div class="insert-group" role="group" aria-label={group.label} style={`--group-bg: ${group.background}`}>
          <div class="insert-group-label">{group.label}</div>
          {#each group.items as directive (directive.id)}
            <button
              type="button"
              role="menuitem"
              title={directive.description}
              onclick={() => choose(directive.id)}>{directive.label}</button
            >
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</span>

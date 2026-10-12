<script lang="ts">
  import { DIRECTIVE_GROUPS, rowsForGroup } from '../core/directives';

  const groups = DIRECTIVE_GROUPS.map((group) => ({ ...group, rows: rowsForGroup(group) }));

  let open = $state(false);
  let pinned = $state(false);
  let root = $state<HTMLElement | null>(null);
  let button = $state<HTMLButtonElement | null>(null);
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  function clearTimers() {
    clearTimeout(hoverTimer);
    clearTimeout(closeTimer);
  }

  function scheduleOpen() {
    if (open || pinned) return;
    clearTimeout(closeTimer);
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => (open = true), 250);
  }

  function scheduleClose() {
    if (pinned) return;
    clearTimeout(hoverTimer);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => (open = false), 150);
  }

  function toggle() {
    clearTimers();
    if (open && pinned) {
      close(false);
    } else {
      open = true;
      pinned = true;
    }
  }

  function close(restoreFocus: boolean) {
    clearTimers();
    open = false;
    pinned = false;
    if (restoreFocus) button?.focus();
  }

  function onWindowClick(event: MouseEvent) {
    if (!open) return;
    if (root && event.target instanceof Node && root.contains(event.target)) return;
    close(false);
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) close(true);
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<span class="help" bind:this={root}>
  <button
    class="help-icon"
    type="button"
    aria-label="ChordPro syntax help"
    aria-haspopup="dialog"
    aria-expanded={open}
    bind:this={button}
    onclick={toggle}
    onmouseenter={scheduleOpen}
    onmouseleave={scheduleClose}
  >
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.4" />
      <circle cx="8" cy="5" r="0.9" fill="currentColor" />
      <rect x="7.25" y="6.8" width="1.5" height="4.6" rx="0.75" fill="currentColor" />
    </svg>
  </button>

  {#if open}
    <div
      class="help-popover"
      role="dialog"
      aria-label="ChordPro syntax help"
      tabindex="-1"
      onmouseenter={clearTimers}
      onmouseleave={scheduleClose}
    >
      <div class="help-head">
        <strong>ChordPro quick reference</strong>
        <button class="help-close" type="button" aria-label="Close" onclick={() => close(true)}>×</button>
      </div>
      {#each groups as group (group.id)}
        <div class="help-group" data-group={group.id}>
          <div class="help-group-label">{group.label}</div>
          <table class="help-table">
            <tbody>
              {#each group.rows as row (row.id)}
                <tr>
                  <td>
                    {#each row.syntax as token}<code>{token}</code>{/each}
                  </td>
                  <td class="help-effect">{row.description}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/each}
      <p class="help-note">
        Empty lines separate paragraphs, also inside explicit sections. Unknown directives are
        ignored in the preview but preserved on export.
      </p>
    </div>
  {/if}
</span>

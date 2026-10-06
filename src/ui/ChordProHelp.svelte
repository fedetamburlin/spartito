<script lang="ts">
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
      <table class="help-table">
        <tbody>
          <tr>
            <td><code>{'{title: My song}'}</code></td>
            <td class="help-effect">Song title</td>
          </tr>
          <tr>
            <td><code>{'{subtitle: ...}'}</code> <code>{'{artist: ...}'}</code></td>
            <td class="help-effect">Subtitle or artist (alias <code>{'{st: ...}'}</code>)</td>
          </tr>
          <tr>
            <td><code>{'{comment: ...}'}</code> <code>{'{c: ...}'}</code></td>
            <td class="help-effect">Comment line</td>
          </tr>
          <tr>
            <td><code>{'{capo: 2}'}</code> <code>{'{capo: II}'}</code></td>
            <td class="help-effect">Capo 0–12 (digits or Roman numerals), shown under the title</td>
          </tr>
          <tr>
            <td><code>[Am]Hello [C]world</code></td>
            <td class="help-effect">Chord above the word that follows it</td>
          </tr>
          <tr>
            <td><code>[C][G]word</code></td>
            <td class="help-effect">Several chords on one word</td>
          </tr>
          <tr>
            <td><code>[Do] [Lam] [Sol]</code></td>
            <td class="help-effect">Italian note names work too</td>
          </tr>
          <tr>
            <td><code>[C] [G] [Am]</code></td>
            <td class="help-effect">Chord-only line (on a line of its own)</td>
          </tr>
          <tr>
            <td><code>{'{start_of_chorus}'}</code> <code>{'{soc}'}</code></td>
            <td class="help-effect">
              Chorus section, closed by <code>{'{end_of_chorus}'}</code> / <code>{'{eoc}'}</code>;
              optional label <code>{'{soc: Chorus}'}</code>
            </td>
          </tr>
          <tr>
            <td><code>{'{start_of_verse}'}</code> <code>{'{sov}'}</code></td>
            <td class="help-effect">
              Verse section; bridge is <code>{'{start_of_bridge}'}</code> / <code>{'{sob}'}</code>
            </td>
          </tr>
          <tr>
            <td><code>(blank line)</code></td>
            <td class="help-effect">Separates blocks</td>
          </tr>
        </tbody>
      </table>
      <p class="help-note">
        Unknown directives are ignored in the preview but preserved on export.
      </p>
    </div>
  {/if}
</span>

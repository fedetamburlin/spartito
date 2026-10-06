<script lang="ts">
  import { config } from './core/config';
  import { parseChordPro } from './core/chordpro';
  import { DEMO_SONG } from './core/demo';
  import { loadState, saveState } from './core/persistence';
  import { sanitizeSettings, withTranspose, type SongSettings } from './core/settings';
  import { transposedForDisplay } from './core/transpose';
  import EditorPane from './ui/EditorPane.svelte';
  import PreviewPane from './ui/PreviewPane.svelte';
  import Toolbar from './ui/Toolbar.svelte';

  const stored = loadState();
  let source = $state(stored?.source ?? DEMO_SONG);
  let settings = $state<SongSettings>(sanitizeSettings(stored?.settings));
  let doc = $derived(parseChordPro(source));
  let display = $derived(transposedForDisplay(doc, settings.transpose));

  function isEditing(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable
    );
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey || isEditing(event.target)) return;
    if (event.key === '+' || event.key === '=') {
      settings = withTranspose(settings, 1);
    } else if (event.key === '-' || event.key === '_') {
      settings = withTranspose(settings, -1);
    } else {
      return;
    }
    event.preventDefault();
  }

  const DEFAULT_EDITOR_PCT = 32;
  const MIN_EDITOR_PX = 200;
  const MIN_PREVIEW_PX = 280;

  let editorPct = $state(DEFAULT_EDITOR_PCT);
  let workspaceEl = $state<HTMLElement | null>(null);
  let dragging = $state(false);

  function clampPct(pct: number, width: number): number {
    const min = (MIN_EDITOR_PX / width) * 100;
    const max = 100 - (MIN_PREVIEW_PX / width) * 100;
    return Math.min(max, Math.max(min, pct));
  }

  function setSplitFromX(clientX: number) {
    const el = workspaceEl;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    editorPct = clampPct(((clientX - rect.left) / rect.width) * 100, rect.width);
  }

  function startDrag(event: PointerEvent) {
    dragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveDrag(event: PointerEvent) {
    if (!dragging) return;
    setSplitFromX(event.clientX);
  }

  function endDrag(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }

  function resetSplit() {
    editorPct = DEFAULT_EDITOR_PCT;
  }

  function onSplitKeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home') return;
    event.preventDefault();
    if (event.key === 'Home') {
      resetSplit();
      return;
    }
    const rect = workspaceEl?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    editorPct = clampPct(editorPct + (event.key === 'ArrowLeft' ? -2 : 2), rect.width);
  }

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const payload = {
      schemaVersion: 1,
      source,
      settings: { ...settings }
    };
    document.title = doc.title ? doc.title : 'Spartito';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveState(payload), config.storage.autosaveDebounceMs);
  });
</script>

<svelte:window onkeydown={onKeydown} />

<div class="app">
  <Toolbar {doc} bind:source bind:settings />
  <main
    class="app-workspace"
    class:dragging
    bind:this={workspaceEl}
    style={`--editor-pct: ${editorPct}%`}
  >
    <EditorPane bind:source />
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="splitter"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize editor and preview"
      tabindex="0"
      onpointerdown={startDrag}
      onpointermove={moveDrag}
      onpointerup={endDrag}
      onpointercancel={endDrag}
      ondblclick={resetSplit}
      onkeydown={onSplitKeydown}
    ></div>
    <PreviewPane doc={display.doc} capo={display.capo} {settings} />
  </main>
</div>

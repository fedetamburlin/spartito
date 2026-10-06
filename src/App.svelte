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
  <main class="app-workspace">
    <EditorPane bind:source />
    <PreviewPane doc={display.doc} capo={display.capo} {settings} />
  </main>
</div>

<script lang="ts">
  import { config } from './core/config';
  import { parseChordPro } from './core/chordpro';
  import { DEMO_SONG } from './core/demo';
  import { loadState, saveState } from './core/persistence';
  import { sanitizeSettings, type SongSettings } from './core/settings';
  import EditorPane from './ui/EditorPane.svelte';
  import PreviewPane from './ui/PreviewPane.svelte';
  import Toolbar from './ui/Toolbar.svelte';

  const stored = loadState();
  let source = $state(stored?.source ?? DEMO_SONG);
  let settings = $state<SongSettings>(sanitizeSettings(stored?.settings));
  let doc = $derived(parseChordPro(source));

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

<div class="app">
  <Toolbar {doc} bind:source bind:settings />
  <main class="app-workspace">
    <EditorPane bind:source />
    <PreviewPane {doc} {settings} />
  </main>
</div>

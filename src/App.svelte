<script lang="ts">
  import { createBridge, type BridgeStatus } from './core/bridge';
  import { openLibraryDb, type LibraryStore, type SongEntry } from './core/db';
  import { config } from './core/config';
  import { clearDocumentHash, readDocumentFromHash } from './core/deeplink';
  import { parseChordPro } from './core/chordpro';
  import { DEMO_SONG } from './core/demo';
  import {
    contentMatches,
    createSong,
    duplicateSong,
    initLibrary,
    NEW_SONG_SOURCE,
    removeSong,
    songTitle,
    sortSongs,
    withTitle
  } from './core/library';
  import { loadLegacyState } from './core/persistence';
  import { sanitizeSettings, withTranspose, type SongSettings } from './core/settings';
  import { transposedForDisplay } from './core/transpose';
  import EditorPane from './ui/EditorPane.svelte';
  import PreviewPane from './ui/PreviewPane.svelte';
  import Sidebar from './ui/Sidebar.svelte';
  import Toolbar from './ui/Toolbar.svelte';

  const shared = readDocumentFromHash(location.hash);
  if (shared) clearDocumentHash();
  const ephemeral = shared !== null;

  let ready = $state(ephemeral);
  let store: LibraryStore | null = null;
  let songs = $state<SongEntry[]>([]);
  let activeId = $state('');
  let sidebarOpen = $state(true);

  let source = $state(shared?.source ?? DEMO_SONG);
  let settings = $state<SongSettings>(sanitizeSettings(shared?.settings));
  let doc = $derived(parseChordPro(source));
  let display = $derived(transposedForDisplay(doc, settings.transpose));

  const orderedSongs = $derived(sortSongs(songs));
  const listItems = $derived(
    orderedSongs.map((song) => ({
      id: song.id,
      title: songTitle(song.source),
      active: song.id === activeId
    }))
  );

  if (!ephemeral) {
    void (async () => {
      try {
        store = await openLibraryDb();
        const state = await initLibrary(store, loadLegacyState(), DEMO_SONG);
        songs = state.songs;
        activeId = state.activeId;
        sidebarOpen = state.sidebarOpen;
        const active = state.songs.find((song) => song.id === state.activeId);
        if (active) {
          source = active.source;
          settings = active.settings;
        }
      } catch (error) {
        console.error('[spartito] library unavailable, changes will not be saved:', error);
      } finally {
        ready = true;
      }
    })();
  }

  function saveSong(id: string, nextSource: string, nextSettings: SongSettings) {
    if (!store) return;
    const entry = songs.find((song) => song.id === id);
    if (!entry || contentMatches(entry, nextSource, nextSettings)) return;
    const updated: SongEntry = {
      ...entry,
      source: nextSource,
      settings: { ...nextSettings },
      updatedAt: Date.now()
    };
    songs = songs.map((song) => (song.id === id ? updated : song));
    void store.putSong(updated);
  }

  function flushActive() {
    if (!store || !activeId) return;
    saveSong(activeId, source, settings);
  }

  function selectSong(id: string) {
    if (id === activeId) return;
    const target = songs.find((song) => song.id === id);
    if (!target) return;
    flushActive();
    clearTimeout(saveTimer);
    activeId = id;
    source = target.source;
    settings = target.settings;
    void store?.putMeta('activeId', id);
  }

  function addSong(initial?: { source: string; settings?: Partial<SongSettings> }) {
    const merged = initial?.settings
      ? sanitizeSettings({ ...settings, ...initial.settings })
      : { ...settings, transpose: 0 };
    const song = createSong(initial?.source ?? NEW_SONG_SOURCE, merged);
    if (store && activeId) {
      flushActive();
      clearTimeout(saveTimer);
      songs = [...songs, song];
      void store.putSong(song);
      activeId = song.id;
      source = song.source;
      settings = song.settings;
      void store.putMeta('activeId', song.id);
      return;
    }
    // No library (shared document): just load the content.
    source = song.source;
    settings = song.settings;
  }

  function duplicate(id: string) {
    const target = songs.find((song) => song.id === id);
    if (!target) return;
    const copy = duplicateSong(target);
    songs = [...songs, copy];
    void store?.putSong(copy);
    if (store) selectSong(copy.id);
  }

  function rename(id: string, title: string) {
    const clean = title.trim();
    const target = songs.find((song) => song.id === id);
    if (!target || !clean) return;
    const nextSource = withTitle(target.source, clean);
    const updated: SongEntry = { ...target, source: nextSource, updatedAt: Date.now() };
    songs = songs.map((song) => (song.id === id ? updated : song));
    void store?.putSong(updated);
    if (id === activeId) source = nextSource;
  }

  async function remove(id: string) {
    const target = songs.find((song) => song.id === id);
    if (!target) return;
    if (!confirm(`Delete "${songTitle(target.source)}"?`)) return;
    if (!store) return;

    // Flush the active song first, then drop any pending autosave so it
    // cannot rewrite (or resurrect) the deleted one.
    flushActive();
    clearTimeout(saveTimer);

    const result = await removeSong(store, songs, id, activeId, {
      ...settings,
      transpose: 0
    });
    songs = result.songs;
    if (result.removedActive) {
      const next = result.songs.find((song) => song.id === result.activeId) ?? result.songs[0];
      activeId = next.id;
      source = next.source;
      settings = next.settings;
      void store.putMeta('activeId', next.id);
    }
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    void store?.putMeta('sidebarOpen', sidebarOpen);
  }

  function importAsSong(text: string, importedSettings?: Partial<SongSettings>) {
    if (ephemeral || !store) {
      source = text;
      if (importedSettings) settings = sanitizeSettings({ ...settings, ...importedSettings });
      return;
    }
    addSong({ source: text, settings: importedSettings });
  }

  let bridgeStatus = $state<BridgeStatus>('disconnected');
  const bridge = createBridge({
    getState: () => ({ source, settings: { ...settings } }),
    setSource: (value) => {
      source = value;
    },
    updateSettings: (patch) => {
      settings = sanitizeSettings({ ...settings, ...patch });
      return { ...settings };
    }
  });
  bridge.onStatus((next) => (bridgeStatus = next));

  function toggleBridge() {
    if (bridgeStatus === 'connected') bridge.disconnect();
    else bridge.connect();
  }

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
    const currentSource = source;
    const currentSettings = { ...settings };
    const currentId = activeId;
    document.title = doc.title ? doc.title : 'Spartito';
    if (ephemeral || !ready || !store || !currentId) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveSong(currentId, currentSource, currentSettings);
    }, config.storage.autosaveDebounceMs);
  });

  $effect(() => {
    bridge.sendState({ source, settings: { ...settings } });
  });
</script>

<svelte:window onkeydown={onKeydown} />

<div class="app">
  <header class="app-header">
    <img class="app-logo" src="favicon.svg" alt="" width="18" height="18" />
    <span class="app-name">Spartito</span>
  </header>
  {#if ready}
    <Toolbar
      {doc}
      bind:source
      bind:settings
      {bridgeStatus}
      onToggleBridge={toggleBridge}
      onImportSong={importAsSong}
    />
    <div class="app-body">
      {#if !ephemeral}
        <Sidebar
          songs={listItems}
          open={sidebarOpen}
          onToggle={toggleSidebar}
          onSelect={selectSong}
          onNew={() => addSong()}
          onRename={rename}
          onDuplicate={duplicate}
          onDelete={remove}
        />
      {/if}
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
  {:else}
    <div class="app-loading">Loading library…</div>
  {/if}
</div>

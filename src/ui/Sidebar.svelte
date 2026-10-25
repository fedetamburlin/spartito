<script lang="ts">
  import type { PersistenceState } from '../core/storage';

  interface SongItem {
    id: string;
    title: string;
    active: boolean;
  }

  interface Props {
    songs: SongItem[];
    open: boolean;
    persistence: PersistenceState;
    canExportBackup: boolean;
    canRestoreBackup: boolean;
    onToggle: () => void;
    onSelect: (id: string) => void;
    onNew: () => void;
    onRename: (id: string, title: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    onExportBackup: () => void;
    onRestoreBackup: (file: File) => void;
  }

  let {
    songs,
    open,
    persistence,
    canExportBackup,
    canRestoreBackup,
    onToggle,
    onSelect,
    onNew,
    onRename,
    onDuplicate,
    onDelete,
    onExportBackup,
    onRestoreBackup
  }: Props = $props();

  let editingId = $state<string | null>(null);
  let draft = $state('');
  let backupInput = $state<HTMLInputElement | null>(null);

  const storageNote = $derived.by(() => {
    if (persistence === 'granted') {
      return {
        text: 'Storage: protected',
        warning: false,
        title: 'The browser has granted persistent storage for this library.'
      };
    }
    if (persistence === 'pending') {
      return { text: 'Storage: checking…', warning: false, title: 'Checking storage permissions.' };
    }
    if (persistence === 'denied') {
      return {
        text: 'Storage: best effort — back up',
        warning: true,
        title: 'The browser may clear this library when storage is low. Export a backup regularly.'
      };
    }
    return {
      text: 'Storage: local only — back up',
      warning: true,
      title:
        'This browser does not guarantee persistent storage. The library may be cleared when storage is low. Export a backup regularly.'
    };
  });

  function startRename(song: SongItem) {
    editingId = song.id;
    draft = song.title === 'Untitled' ? '' : song.title;
  }

  function commitRename() {
    if (editingId) onRename(editingId, draft);
    editingId = null;
  }

  function onRenameKey(event: KeyboardEvent) {
    if (event.key === 'Enter') commitRename();
    else if (event.key === 'Escape') editingId = null;
  }

  function focusInput(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  function pickBackup(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) onRestoreBackup(file);
  }
</script>

<aside class="sidebar" class:rail={!open} aria-label="Songs">
  <div class="sidebar-head">
    <button
      class="icon-button"
      type="button"
      title={open ? 'Hide songs' : 'Show songs'}
      aria-expanded={open}
      onclick={onToggle}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M2.5 3.5h11M2.5 8h11M2.5 12.5h11"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
      </svg>
    </button>
    {#if open}
      <span class="sidebar-title">Songs</span>
    {/if}
    <button class="icon-button" type="button" title="New song" onclick={onNew}>
      <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
        <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    </button>
  </div>

  {#if open}
    <div class="song-list">
      {#each songs as song (song.id)}
        <div class="song-item" class:active={song.active}>
          {#if editingId === song.id}
            <input
              class="song-rename"
              value={draft}
              spellcheck="false"
              oninput={(event) => (draft = event.currentTarget.value)}
              onkeydown={onRenameKey}
              onblur={commitRename}
              use:focusInput
            />
          {:else}
            <button
              class="song-select"
              type="button"
              title={song.title}
              onclick={() => onSelect(song.id)}
              ondblclick={() => startRename(song)}>{song.title}</button
            >
            <span class="song-actions">
              <button
                class="icon-button"
                type="button"
                title="Rename"
                onclick={() => startRename(song)}
              >
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  <path
                    d="M10.8 2.6l2.6 2.6L5.6 13l-3.1.5.5-3.1 7.8-7.8z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button
                class="icon-button"
                type="button"
                title="Duplicate"
                onclick={() => onDuplicate(song.id)}
              >
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  <rect
                    x="2.5"
                    y="2.5"
                    width="8"
                    height="8"
                    rx="1.2"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.3"
                  />
                  <rect
                    x="5.5"
                    y="5.5"
                    width="8"
                    height="8"
                    rx="1.2"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.3"
                  />
                </svg>
              </button>
              <button
                class="icon-button danger"
                type="button"
                title="Delete"
                onclick={() => onDelete(song.id)}
              >
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  <path
                    d="M3 4.5h10M6.5 4.5V3h3v1.5M4.7 4.5l.6 8.4h5.4l.6-8.4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </span>
          {/if}
        </div>
      {/each}
    </div>

    <div class="sidebar-foot">
      <div class="sidebar-foot-actions">
        <button
          type="button"
          class="sidebar-action"
          title="Download every song and its layout settings as a JSON backup"
          disabled={!canExportBackup}
          onclick={onExportBackup}>Backup</button
        >
        <button
          type="button"
          class="sidebar-action"
          title="Restore songs from a JSON backup"
          disabled={!canRestoreBackup}
          onclick={() => backupInput?.click()}>Restore</button
        >
      </div>
      <span class="storage-note" class:warning={storageNote.warning} title={storageNote.title}>
        {storageNote.text}
      </span>
      <input
        class="hidden-input library-restore-input"
        type="file"
        accept=".json,application/json"
        bind:this={backupInput}
        onchange={pickBackup}
      />
    </div>
  {/if}
</aside>

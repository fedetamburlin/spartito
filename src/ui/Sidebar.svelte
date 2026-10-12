<script lang="ts">
  interface SongItem {
    id: string;
    title: string;
    active: boolean;
  }

  interface Props {
    songs: SongItem[];
    open: boolean;
    onToggle: () => void;
    onSelect: (id: string) => void;
    onNew: () => void;
    onRename: (id: string, title: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
  }

  let { songs, open, onToggle, onSelect, onNew, onRename, onDuplicate, onDelete }: Props =
    $props();

  let editingId = $state<string | null>(null);
  let draft = $state('');

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
  {/if}
</aside>

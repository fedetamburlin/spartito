<script lang="ts">
  import {
    emptySongbook,
    moveSongbookSong,
    removeSongbookSong,
    toggleSongbookSong,
    type SongbookDraft
  } from '../core/songbook';
  import { trapFocus } from './focus';

  /**
   * Pick songs from the library and order them for a songbook export.
   * The draft lives here: it only leaves the dialog as an export request.
   */

  interface SongbookItem {
    id: string;
    title: string;
  }

  interface Props {
    songs: SongbookItem[];
    onExport: (draft: SongbookDraft) => void;
    onClose: () => void;
  }

  let { songs, onExport, onClose }: Props = $props();

  let query = $state('');
  let draft = $state(emptySongbook());

  const needle = $derived(query.trim().toLowerCase());
  const filtered = $derived(
    needle ? songs.filter((song) => song.title.toLowerCase().includes(needle)) : songs
  );
  const selected = $derived(
    draft.ids
      .map((id) => songs.find((song) => song.id === id))
      .filter((song): song is SongbookItem => song !== undefined)
  );

  const isPicked = (id: string) => draft.ids.includes(id);
  const toggle = (id: string) => (draft = toggleSongbookSong(draft, id));
  const move = (id: string, delta: -1 | 1) => (draft = moveSongbookSong(draft, id, delta));
  const remove = (id: string) => (draft = removeSongbookSong(draft, id));
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onClose()} />

<div class="modal-backdrop">
  <div
    class="modal songbook-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="songbook-title"
    tabindex="-1"
    use:trapFocus
  >
    <h2 id="songbook-title">Songbook</h2>
    <p class="hint">
      Pick songs from the library and set their order: each one is printed on its own page.
    </p>
    <div class="songbook-columns">
      <section class="songbook-panel" aria-label="Library">
        <input
          class="songbook-search"
          type="search"
          placeholder="Search songs…"
          aria-label="Search songs"
          data-autofocus
          bind:value={query}
        />
        <ul class="songbook-list">
          {#each filtered as song (song.id)}
            <li>
              <button
                type="button"
                class="songbook-pick"
                class:picked={isPicked(song.id)}
                aria-pressed={isPicked(song.id)}
                onclick={() => toggle(song.id)}
              >
                <span class="songbook-title">{song.title}</span>
                <span class="songbook-mark" aria-hidden="true">{isPicked(song.id) ? '✓' : '+'}</span
                >
              </button>
            </li>
          {:else}
            <li class="songbook-empty">No songs match.</li>
          {/each}
        </ul>
      </section>
      <section class="songbook-panel" aria-label="Songbook order">
        <div class="songbook-panel-head">
          <span>{selected.length} song{selected.length === 1 ? '' : 's'}</span>
          {#if selected.length > 0}
            <button type="button" class="link" onclick={() => (draft = emptySongbook())}
              >Clear</button
            >
          {/if}
        </div>
        <ol class="songbook-list songbook-order">
          {#each selected as song, index (song.id)}
            <li>
              <span class="songbook-index" aria-hidden="true">{index + 1}</span>
              <span class="songbook-title">{song.title}</span>
              <span class="songbook-actions">
                <button
                  type="button"
                  class="icon-button"
                  title="Move up"
                  aria-label={`Move ${song.title} up`}
                  disabled={index === 0}
                  onclick={() => move(song.id, -1)}>↑</button
                >
                <button
                  type="button"
                  class="icon-button"
                  title="Move down"
                  aria-label={`Move ${song.title} down`}
                  disabled={index === selected.length - 1}
                  onclick={() => move(song.id, 1)}>↓</button
                >
                <button
                  type="button"
                  class="icon-button"
                  title="Remove"
                  aria-label={`Remove ${song.title}`}
                  onclick={() => remove(song.id)}>×</button
                >
              </span>
            </li>
          {:else}
            <li class="songbook-empty">Nothing picked yet.</li>
          {/each}
        </ol>
      </section>
    </div>
    <footer>
      <label class="songbook-cover-toggle">
        <input type="checkbox" bind:checked={draft.cover} />
        Cover page
      </label>
      <span class="spacer"></span>
      <button onclick={onClose}>Cancel</button>
      <button
        class="primary"
        disabled={selected.length === 0}
        onclick={() => onExport({ ...draft })}>Export PDF</button
      >
    </footer>
  </div>
</div>

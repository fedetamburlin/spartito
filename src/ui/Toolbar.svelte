<script lang="ts">
  import { config } from '../core/config';
  import { importSong } from '../core/import';
  import type { SongDocument } from '../core/model';
  import { buildJsonExport, fileBaseName, parseImported } from '../core/persistence';
  import { sanitizeSettings, type SongSettings } from '../core/settings';
  import ImportDialog from './ImportDialog.svelte';

  interface Props {
    doc: SongDocument;
    source: string;
    settings: SongSettings;
  }

  let { doc, source = $bindable(), settings = $bindable() }: Props = $props();

  let fileInput = $state<HTMLInputElement | null>(null);
  let importOpen = $state(false);

  const columnValue = $derived(
    settings.columns === 'auto' ? 'auto' : String(settings.columns)
  );

  function download(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCho() {
    download(`${fileBaseName(doc.title)}.cho`, source, 'text/plain;charset=utf-8');
  }

  function exportJson() {
    download(
      `${fileBaseName(doc.title)}.json`,
      buildJsonExport(source, settings),
      'application/json'
    );
  }

  function onImport(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = parseImported(String(reader.result ?? ''), file.name);
      if (imported.settings) {
        source = imported.source;
        settings = sanitizeSettings({ ...settings, ...imported.settings });
      } else {
        source = importSong(imported.source).chordpro;
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  function setFont(event: Event) {
    settings = { ...settings, fontId: (event.currentTarget as HTMLSelectElement).value };
  }

  function setTextPt(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    settings = sanitizeSettings({ ...settings, textPt: value });
  }

  function setColumns(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    settings = {
      ...settings,
      columns: value === 'auto' ? 'auto' : value === '2' ? 2 : 1
    };
  }

  function setMargins(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    settings = sanitizeSettings({ ...settings, marginsMm: value });
  }

  function setColor(key: 'textColor' | 'chordColor' | 'commentColor', event: Event) {
    settings = { ...settings, [key]: (event.currentTarget as HTMLInputElement).value };
  }
</script>

<header class="app-toolbar">
  <div class="toolbar-group">
    <label>Font
      <select value={settings.fontId} onchange={setFont}>
        {#each config.typography.fonts as font}
          <option value={font.id}>{font.family}</option>
        {/each}
      </select>
    </label>
    <label>Testo
      <input
        type="number"
        min={config.layout.textPtMin}
        max={config.layout.textPtMax}
        step="0.5"
        value={settings.textPt}
        onchange={setTextPt}
      /> pt
    </label>
    <label>Colonne
      <select value={columnValue} onchange={setColumns}>
        <option value="auto">auto</option>
        <option value="1">1</option>
        <option value="2">2</option>
      </select>
    </label>
    <label>Margini
      <input
        type="number"
        min={config.page.marginsMinMm}
        max={config.page.marginsMaxMm}
        step="0.5"
        value={settings.marginsMm}
        onchange={setMargins}
      /> mm
    </label>
  </div>
  <div class="toolbar-group">
    <label>Accordi <input
        type="color"
        value={settings.chordColor}
        oninput={(event) => setColor('chordColor', event)}
      /></label>
    <label>Testo <input
        type="color"
        value={settings.textColor}
        oninput={(event) => setColor('textColor', event)}
      /></label>
    <label>Commenti <input
        type="color"
        value={settings.commentColor}
        oninput={(event) => setColor('commentColor', event)}
      /></label>
  </div>
  <div class="toolbar-group toolbar-actions">
    <button onclick={() => (importOpen = true)}>Incolla testo</button>
    <button onclick={() => fileInput?.click()}>Importa file</button>
    <button onclick={exportCho}>Esporta .cho</button>
    <button onclick={exportJson}>Esporta .json</button>
    <button class="primary" onclick={() => window.print()}>Stampa PDF</button>
    <input
      class="hidden-input"
      type="file"
      accept=".cho,.crd,.json,.txt,text/plain"
      bind:this={fileInput}
      onchange={onImport}
    />
  </div>
</header>

{#if importOpen}
  <ImportDialog
    onApply={(text) => (source = text)}
    onClose={() => (importOpen = false)}
  />
{/if}

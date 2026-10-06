<script lang="ts">
  import { config } from '../core/config';
  import { importSong } from '../core/import';
  import type { SongDocument } from '../core/model';
  import { extractPdfText } from '../core/pdf';
  import { buildJsonExport, fileBaseName, parseImported } from '../core/persistence';
  import { sanitizeSettings, withTranspose, type SongSettings } from '../core/settings';
  import { TRANSPOSE_MAX, TRANSPOSE_MIN } from '../core/transpose';
  import ImportDialog from './ImportDialog.svelte';

  interface Props {
    doc: SongDocument;
    source: string;
    settings: SongSettings;
  }

  let { doc, source = $bindable(), settings = $bindable() }: Props = $props();

  let fileInput = $state<HTMLInputElement | null>(null);
  let importOpen = $state(false);
  let importSeed = $state('');
  let importTitle = $state<string | undefined>(undefined);
  let importHint = $state<string | undefined>(undefined);

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

  function openPaste() {
    importSeed = '';
    importTitle = undefined;
    importHint = undefined;
    importOpen = true;
  }

  async function importPdf(file: File, input: HTMLInputElement) {
    try {
      const { text, hasText } = await extractPdfText(await file.arrayBuffer());
      if (!hasText) {
        alert('PDF has no extractable text: if it is a scan, OCR is required (not supported).');
        return;
      }
      importSeed = text;
      importTitle = 'Import PDF (extracted text)';
      importHint =
        'Text extracted from the PDF (best effort): check chord order and alignment, then Convert.';
      importOpen = true;
    } catch {
      alert('PDF not readable (protected, corrupted or without text).');
    } finally {
      input.value = '';
    }
  }

  function onImport(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.pdf')) {
      void importPdf(file, input);
      return;
    }
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
    <label>Text
      <input
        type="number"
        min={config.layout.textPtMin}
        max={config.layout.textPtMax}
        step="0.5"
        value={settings.textPt}
        onchange={setTextPt}
      /> pt
    </label>
    <label>Columns
      <select value={columnValue} onchange={setColumns}>
        <option value="auto">auto</option>
        <option value="1">1</option>
        <option value="2">2</option>
      </select>
    </label>
    <label>Margins
      <input
        type="number"
        min={config.page.marginsMinMm}
        max={config.page.marginsMaxMm}
        step="0.5"
        value={settings.marginsMm}
        onchange={setMargins}
      /> mm
    </label>
    <label>Transpose
      <span class="stepper">
        <button
          type="button"
          title="One semitone down"
          disabled={settings.transpose <= TRANSPOSE_MIN}
          onclick={() => (settings = withTranspose(settings, -1))}>−</button>
        <button
          type="button"
          class="stepper-value"
          title="Reset transposition"
          disabled={settings.transpose === 0}
          onclick={() => (settings = sanitizeSettings({ ...settings, transpose: 0 }))}
        >{settings.transpose > 0 ? `+${settings.transpose}` : settings.transpose}</button>
        <button
          type="button"
          title="One semitone up"
          disabled={settings.transpose >= TRANSPOSE_MAX}
          onclick={() => (settings = withTranspose(settings, 1))}>+</button>
      </span>
    </label>
  </div>
  <div class="toolbar-group">
    <label>Chords <input
        type="color"
        value={settings.chordColor}
        oninput={(event) => setColor('chordColor', event)}
      /></label>
    <label>Text <input
        type="color"
        value={settings.textColor}
        oninput={(event) => setColor('textColor', event)}
      /></label>
    <label>Comments <input
        type="color"
        value={settings.commentColor}
        oninput={(event) => setColor('commentColor', event)}
      /></label>
  </div>
  <div class="toolbar-group toolbar-actions">
    <button class="btn-import" onclick={openPaste}>Paste text</button>
    <button class="btn-import" onclick={() => fileInput?.click()}>Import file</button>
    <button class="btn-export" onclick={exportCho}>Export .cho</button>
    <button class="btn-export" onclick={exportJson}>Export .json</button>
    <button
      class="primary"
      title="Save as PDF · default margins · headers off"
      onclick={() => window.print()}>Print PDF</button>
    <input
      class="hidden-input"
      type="file"
      accept=".cho,.crd,.json,.txt,.pdf,text/plain,application/pdf"
      bind:this={fileInput}
      onchange={onImport}
    />
  </div>
</header>

{#if importOpen}
  <ImportDialog
    onApply={(text) => (source = text)}
    onClose={() => (importOpen = false)}
    initialText={importSeed}
    title={importTitle}
    hint={importHint}
  />
{/if}

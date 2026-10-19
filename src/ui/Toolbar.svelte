<script lang="ts">
  import { config } from '../core/config';
  import type { BridgeStatus } from '../core/bridge';
  import { importSong } from '../core/import';
  import type { SongDocument } from '../core/model';
  import { extractPdfText } from '../core/pdf';
  import { fileBaseName, parseImported } from '../core/persistence';
  import { sanitizeSettings, withTranspose, type SongSettings } from '../core/settings';
  import {
    applyTheme,
    loadThemePref,
    saveThemePref,
    type Theme,
    type ThemePref
  } from '../core/theme';
  import { TRANSPOSE_MAX, TRANSPOSE_MIN } from '../core/transpose';
  import ImportDialog from './ImportDialog.svelte';

  interface Props {
    doc: SongDocument;
    source: string;
    settings: SongSettings;
    bridgeStatus: BridgeStatus;
    onToggleBridge: () => void;
    onImportSong: (text: string, settings?: Partial<SongSettings>) => void;
  }

  let {
    doc,
    source = $bindable(),
    settings = $bindable(),
    bridgeStatus,
    onToggleBridge,
    onImportSong
  }: Props = $props();

  let fileInput = $state<HTMLInputElement | null>(null);
  let importOpen = $state(false);
  let importSeed = $state('');
  let importTitle = $state<string | undefined>(undefined);
  let importHint = $state<string | undefined>(undefined);

  const columnValue = $derived(settings.columns === 'auto' ? 'auto' : String(settings.columns));

  const bridgeTitle = $derived(
    bridgeStatus === 'connected'
      ? 'Connected to the MCP server on 127.0.0.1:7331 · click to disconnect'
      : bridgeStatus === 'failed'
        ? 'Connection failed: is the MCP server running? If the browser blocked local network access, allow it for this site.'
        : 'Connect to the local MCP server: lets opencode or any MCP client read and edit the open song'
  );

  const bridgeAria = $derived(`MCP server: ${bridgeStatus}`);

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
        onImportSong(imported.source, imported.settings);
      } else {
        onImportSong(importSong(imported.source).chordpro);
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

  const initialPref = loadThemePref();
  let themePref = $state<ThemePref>(initialPref);
  let theme = $state<Theme>(applyTheme(initialPref));

  const themeTitle = $derived(
    `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme${
      themePref === 'auto' ? ' (currently following the system)' : ''
    }`
  );

  function toggleTheme() {
    themePref = theme === 'dark' ? 'light' : 'dark';
    saveThemePref(themePref);
    theme = applyTheme(themePref);
  }

  $effect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (themePref === 'auto') theme = applyTheme('auto');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  });
</script>

<header class="app-toolbar">
  <div class="toolbar-group">
    <label
      >Font
      <select value={settings.fontId} onchange={setFont}>
        {#each config.typography.fonts as font (font.id)}
          <option value={font.id}>{font.family}</option>
        {/each}
      </select>
    </label>
    <label
      >Text
      <input
        type="number"
        min={config.layout.textPtMin}
        max={config.layout.textPtMax}
        step="0.5"
        value={settings.textPt}
        onchange={setTextPt}
      /> pt
    </label>
    <label
      >Columns
      <select value={columnValue} onchange={setColumns}>
        <option value="auto">auto</option>
        <option value="1">1</option>
        <option value="2">2</option>
      </select>
    </label>
    <label
      >Margins
      <input
        type="number"
        min={config.page.marginsMinMm}
        max={config.page.marginsMaxMm}
        step="0.5"
        value={settings.marginsMm}
        onchange={setMargins}
      /> mm
    </label>
    <label
      >Transpose
      <span class="stepper">
        <button
          type="button"
          title="One semitone down"
          disabled={settings.transpose <= TRANSPOSE_MIN}
          onclick={() => (settings = withTranspose(settings, -1))}>−</button
        >
        <button
          type="button"
          class="stepper-value"
          title="Reset transposition"
          disabled={settings.transpose === 0}
          onclick={() => (settings = sanitizeSettings({ ...settings, transpose: 0 }))}
          >{settings.transpose > 0 ? `+${settings.transpose}` : settings.transpose}</button
        >
        <button
          type="button"
          title="One semitone up"
          disabled={settings.transpose >= TRANSPOSE_MAX}
          onclick={() => (settings = withTranspose(settings, 1))}>+</button
        >
      </span>
    </label>
  </div>
  <div class="toolbar-group">
    <label
      >Chords <input
        type="color"
        value={settings.chordColor}
        oninput={(event) => setColor('chordColor', event)}
      /></label
    >
    <label
      >Text <input
        type="color"
        value={settings.textColor}
        oninput={(event) => setColor('textColor', event)}
      /></label
    >
    <label
      >Comments <input
        type="color"
        value={settings.commentColor}
        oninput={(event) => setColor('commentColor', event)}
      /></label
    >
  </div>
  <div class="toolbar-group">
    <button
      class="icon-button"
      type="button"
      title={themeTitle}
      aria-label={themeTitle}
      onclick={toggleTheme}
    >
      {#if theme === 'dark'}
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="3.1" fill="none" stroke="currentColor" stroke-width="1.3" />
          <path
            d="M8 1.4v1.7M8 12.9v1.7M1.4 8h1.7M12.9 8h1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M12.6 3.4l-1.2 1.2M4.6 11.4l-1.2 1.2"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
          />
        </svg>
      {:else}
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linejoin="round"
          />
        </svg>
      {/if}
    </button>
  </div>
  <div class="toolbar-group toolbar-actions">
    <div class="toolbar-import">
      <button class="btn-import" title="Paste chords copied from a site" onclick={openPaste}
        >From text</button
      >
      <button
        class="btn-import"
        title="Import a .cho, .crd, .json or text PDF file"
        onclick={() => fileInput?.click()}>From file</button
      >
    </div>
    <div class="toolbar-mcp">
      <button
        class="btn-bridge"
        class:connected={bridgeStatus === 'connected'}
        class:connecting={bridgeStatus === 'connecting'}
        class:failed={bridgeStatus === 'failed'}
        title={bridgeTitle}
        aria-label={bridgeAria}
        onclick={onToggleBridge}>MCP</button
      >
    </div>
    <div class="toolbar-export">
      <button
        class="btn-export"
        title="Download the song as a .cho (ChordPro) file"
        onclick={exportCho}>Export chords</button
      >
      <button
        class="primary"
        title="Save as PDF · default margins · headers off"
        onclick={() => window.print()}>Print PDF</button
      >
    </div>
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
    onApply={(text) => onImportSong(text)}
    onClose={() => (importOpen = false)}
    initialText={importSeed}
    title={importTitle}
    hint={importHint}
  />
{/if}

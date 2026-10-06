import { describe, expect, it } from 'vitest';
import { config } from '../src/core/config';
import { buildJsonExport, fileBaseName, parseImported } from '../src/core/persistence';
import { defaultSettings, sanitizeSettings } from '../src/core/settings';

describe('sanitizeSettings', () => {
  it('applies defaults', () => {
    expect(sanitizeSettings()).toEqual(defaultSettings());
  });

  it('clamps out-of-range values', () => {
    expect(sanitizeSettings({ textPt: 99 }).textPt).toBe(config.layout.textPtMax);
    expect(sanitizeSettings({ textPt: 1 }).textPt).toBe(config.layout.textPtMin);
    expect(sanitizeSettings({ marginsMm: 1 }).marginsMm).toBe(config.page.marginsMinMm);
    expect(sanitizeSettings({ marginsMm: 99 }).marginsMm).toBe(config.page.marginsMaxMm);
    expect(sanitizeSettings({ fontId: 'inesistente' }).fontId).toBe(config.typography.fontDefault);
  });
});

describe('export and import', () => {
  it('JSON roundtrip with source and settings', () => {
    const settings = defaultSettings();
    const exported = buildJsonExport('{title: X}\n[Am]Ciao\n', settings);
    const imported = parseImported(exported, 'brano.json');
    expect(imported.source).toBe('{title: X}\n[Am]Ciao\n');
    expect(imported.settings?.fontId).toBe(settings.fontId);
    expect(imported.settings?.textPt).toBe(settings.textPt);
  });

  it('treats a .cho file as plain source', () => {
    const imported = parseImported('{title: X}\n[Am]Ciao\n', 'brano.cho');
    expect(imported.source).toContain('[Am]Ciao');
    expect(imported.settings).toBeUndefined();
  });

  it('does not mistake a .cho with directives for a JSON wrapper', () => {
    const imported = parseImported('{title: X}\n[Am]Ciao\n', 'brano.txt');
    expect(imported.settings).toBeUndefined();
    expect(imported.source).toBe('{title: X}\n[Am]Ciao\n');
  });
});

describe('fileBaseName', () => {
  it('normalizes title with accents and spaces', () => {
    expect(fileBaseName('Perché È Così')).toBe('perche-e-cosi');
    expect(fileBaseName('!!!')).toBe('song');
  });
});

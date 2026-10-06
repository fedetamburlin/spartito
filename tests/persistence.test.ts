import { describe, expect, it } from 'vitest';
import { config } from '../src/core/config';
import { buildJsonExport, fileBaseName, parseImported } from '../src/core/persistence';
import { defaultSettings, sanitizeSettings } from '../src/core/settings';

describe('sanitizeSettings', () => {
  it('applica i default', () => {
    expect(sanitizeSettings()).toEqual(defaultSettings());
  });

  it('limita i valori fuori range', () => {
    expect(sanitizeSettings({ textPt: 99 }).textPt).toBe(config.layout.textPtMax);
    expect(sanitizeSettings({ textPt: 1 }).textPt).toBe(config.layout.textPtMin);
    expect(sanitizeSettings({ marginsMm: 1 }).marginsMm).toBe(config.page.marginsMinMm);
    expect(sanitizeSettings({ marginsMm: 99 }).marginsMm).toBe(config.page.marginsMaxMm);
    expect(sanitizeSettings({ fontId: 'inesistente' }).fontId).toBe(config.typography.fontDefault);
  });
});

describe('esportazione e importazione', () => {
  it('roundtrip JSON con sorgente e impostazioni', () => {
    const settings = defaultSettings();
    const exported = buildJsonExport('{title: X}\n[Am]Ciao\n', settings);
    const imported = parseImported(exported, 'brano.json');
    expect(imported.source).toBe('{title: X}\n[Am]Ciao\n');
    expect(imported.settings?.fontId).toBe(settings.fontId);
    expect(imported.settings?.textPt).toBe(settings.textPt);
  });

  it('tratta un file .cho come sorgente puro', () => {
    const imported = parseImported('{title: X}\n[Am]Ciao\n', 'brano.cho');
    expect(imported.source).toContain('[Am]Ciao');
    expect(imported.settings).toBeUndefined();
  });

  it('non scambia un .cho con direttive per un wrapper JSON', () => {
    const imported = parseImported('{title: X}\n[Am]Ciao\n', 'brano.txt');
    expect(imported.settings).toBeUndefined();
    expect(imported.source).toBe('{title: X}\n[Am]Ciao\n');
  });
});

describe('fileBaseName', () => {
  it('normalizza titolo con accenti e spazi', () => {
    expect(fileBaseName('Perché È Così')).toBe('perche-e-cosi');
    expect(fileBaseName('!!!')).toBe('canzone');
  });
});

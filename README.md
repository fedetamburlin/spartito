# Spartito

Editor minimale per creare **spartiti PDF A4 verticali** (testo + accordi), pensati per essere letti su qualsiasi tablet come PDF: una canzone = una pagina, colonne automatiche, margini risicati per sfruttare tutto il foglio.

Documentazione di progetto: `doc/sota.md`, `doc/stack.md`, `doc/features.md`, `doc/market.md`. Default modificabili in `config/defaults.json`.

## Requisiti

- Node.js 18.19+ (consigliati 20/22/24 LTS). Con Node 18 il progetto usa Vite 6 + Svelte 5.
- npm.

## Avvio

```bash
npm install
npm run dev
```

## Script

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo Vite |
| `npm run build` | build statica in `dist/` |
| `npm run preview` | serve la build |
| `npm run check` | svelte-check (TypeScript + Svelte) |
| `npm test` | test unitari (Vitest) |

## Uso

Sorgente in **ChordPro (subset)** nell'editor a sinistra, anteprima A4 a destra:

- `{title: ...}`, `{subtitle: ...}`, `{comment: ...}` (o `{c: ...}`)
- accordi inline: `[Am]parola`, anche multipli `[C][G]parola`
- ritornello: `{start_of_chorus}`/`{soc}` … `{end_of_chorus}`/`{eoc}`; strofe `{start_of_verse}`/`{sov}` opzionale
- le direttive non supportate vengono ignorate in resa ma **preservate** all'export

Auto-fit: prova 1 colonna → 2 colonne → riduzione del font fino ai minimi (10pt testo / 9pt accordi) → avviso se il brano non entra. Il PDF esportato resta di una pagina.

Export PDF: pulsante **Stampa PDF** (Chrome/Chromium), scegliendo "Salva come PDF" con margini predefiniti e intestazioni disattivate. Import/export dei sorgenti in `.cho` e `.json`; autosave in `localStorage`.

## Struttura

```
config/defaults.json     default di progetto (pagina, layout, font, colori, export)
public/fonts/            font OFL (Inter, Source Serif 4, JetBrains Mono) + licenze
src/core/                TS puro: config, model, chordpro (parse/serialize), fit, persistence, settings
src/ui/                  componenti Svelte + stili (app.css, paper.css) + measure.ts
tests/                   fixture ChordPro e test unitari
spike/                   spike di validazione stampa A4 e misura overflow (Fase 0)
```

## Stato

POC funzionante (P0): editor singola canzone, anteprima A4, auto-fit, export PDF, import/export, persistenza locale.
Backlog P1/P2 in `doc/features.md` (trasposizione, CodeMirror 6, export automatico, PWA, libreria canzoni, notazione, MCP).

## Licenza

MIT. Donazioni: link PayPal da definire.
Font sotto SIL Open Font License 1.1 (vedi `public/fonts/OFL-*.txt`).

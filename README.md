# Spartito

[![Deploy su GitHub Pages](https://github.com/fedetamburlin/spartito/actions/workflows/deploy.yml/badge.svg)](https://github.com/fedetamburlin/spartito/actions/workflows/deploy.yml)

Sito: https://fedetamburlin.github.io/spartito/

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

Auto-fit: prova 1 colonna → 2 colonne → riduzione del font fino ai minimi (6pt testo / 5pt accordi; default 11/10) → avviso se il brano non entra. Il PDF esportato resta di una pagina.

Export PDF: pulsante **Stampa PDF** (Chrome/Chromium), scegliendo "Salva come PDF" con margini predefiniti e intestazioni disattivate. Import/export dei sorgenti in `.cho` e `.json`; autosave in `localStorage`.

**Import da siti ("Incolla testo"):** copia testo/accordi da un sito (Ultimate Guitar, Accordi e Spartiti, …) e incollalo nella finestra. La conversione è automatica: accordi sopra il testo allineati per colonne → inline, notazione internazionale e italiana (`MIm`, `LAm7`, `DO7+`, `MIm/RE`), intestazioni sezione (`[Verse]`, `[Chorus]`, `Ritornello`, …), titolo/artista dalle pagine UG (marcatore "Chords"/"Tabs"), `Capo/Tuning` e annotazioni `(instrumental)`/`(2x)` come commenti, tablature e righe decorative/di paginazione scartate, righe di soli accordi rese come intro. Il ChordPro già valido passa invariato. Dizionari e pattern sono in `config/import.json`.

**Trasposizione:** stepper `Trasponi − [0] +` in toolbar (o tasti `+`/`−` quando l'editor non è a fuoco; click sul valore per azzerare). Cambia anteprima e PDF, **non** il sorgente né l'export `.cho`; la scelta è salvata nelle impostazioni. La notazione (internazionale/italiana) e i suffissi degli accordi sono preservati.

**Import da PDF:** "Importa file" accetta anche `.pdf` (solo PDF con testo, non scansioni): estrae il testo con `unpdf`, ricostruisce righe e colonne dalle coordinate e apre la revisione nell'ImportDialog. L'allineamento accordo/sillaba è preservato; PDF anomali vanno controllati prima di applicare.

**Capo:** direttiva `{capo: N}` (numeri arabi o romani) letta dal sorgente e mostrata come "Capo N" sotto il titolo. Se il brano ha un capo, la trasposizione muove il capo e lascia invariate le forme (es. "Capo 2", +2 → "Capo 4" con gli stessi accordi); se `C0+T` scende sotto zero, il capo si ferma a 0 e gli accordi scendono. Senza capo, trasposizione classica. L'import converte "Capo 3"/"capo at V" in `{capo: N}`.

## Struttura

```
config/defaults.json     default di progetto (pagina, layout, font, colori, export)
config/import.json       dizionari import (sezioni, etichette metadati)
public/fonts/            font OFL (Inter, Source Serif 4, JetBrains Mono) + licenze
src/core/                TS puro: config, model, chordpro (parse/serialize), chords (grammatica),
                         transpose, import (conversione copia-incolla), pdf (estrazione da PDF),
                         fit, persistence, settings
src/ui/                  componenti Svelte + stili (app.css, paper.css) + measure.ts
tests/                   fixture ChordPro/import e test unitari
spike/                   spike di validazione stampa A4 e misura overflow (Fase 0)
```

## Stato

POC funzionante (P0): editor singola canzone, anteprima A4, auto-fit, export PDF, import/export, persistenza locale, import copia-incolla da siti, import da PDF (testo), trasposizione e capo.
Backlog P1/P2 in `doc/features.md` (CodeMirror 6, export automatico, PWA, libreria canzoni, notazione, MCP).

## Licenza

MIT. Donazioni: link PayPal da definire.
Font sotto SIL Open Font License 1.1 (vedi `public/fonts/OFL-*.txt`).

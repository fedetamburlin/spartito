# Funzionalità dell'app

**Data:** 2026-10-06
**Stato:** proposta condivisa per il POC. P1/P2 sono backlog indicativo.
**Riferimenti:** `doc/stack.md`, `config/defaults.json`.

---

## 1. Concept

- L'app è un **editor di una singola canzone** che produce un **PDF A4 verticale di una pagina**.
- Obiettivo: massima leggibilità e sfruttamento del foglio; cambio pagina solo tra canzoni (una canzone = una pagina).
- Le **colonne sono la leva principale** per far entrare brani lunghi: righe corte + 2 colonne riempiono meglio la pagina.
- Margini risicati (default 5 mm) e spaziatura compatta.
- Il PDF è l'artefatto portabile: si legge su qualsiasi tablet con un reader qualsiasi.

## 2. P0 — POC

### 2.1 Editor

- Una schermata: toolbar controlli + editor testuale + anteprima pagina A4 in tempo reale.
- Titolo e autore facoltativo della canzone.
- Editor monospace (textarea) su sorgente ChordPro-subset; l'anteprima è la pagina reale.

### 2.2 Profilo ChordPro supportato (P0)

| Costrutto | Sintassi | Note |
|---|---|---|
| Accordi inline | `[Am]` prima della sillaba | Resi sopra il testo, allineati |
| Titolo | `{title: ...}` | Obbligatorio per il PDF |
| Autore | `{subtitle: ...}` | Opzionale, ruolo "autore" |
| Commento | `{comment: ...}` o `{c: ...}` | Corsivo, colore dedicato |
| Ritornello | `{start_of_chorus}`/`{soc}` … `{end_of_chorus}`/`{eoc}` | Stile grassetto per ruolo |
| Strofa | implicita; `{start_of_verse}`/`{sov}` opzionale | Etichetta sezione opzionale |
| Direttive non supportate | qualsiasi altra | Ignorate in resa, **preservate** all'export |

Obiettivo: import/export compatibile con i file `.cho` esistenti senza perdere informazione.

### 2.3 Layout e auto-fit

- Formato A4 verticale; margini configurabili 4–10 mm (default 5).
- Colonne 1 o 2, con passaggio automatico quando il contenuto sfora.
- Font: 3 famiglie OFL (Inter, Source Serif 4, JetBrains Mono per l'editor).
- Corpo testo 11pt default, minimo 10pt; accordi 10pt default, minimo 9pt; leading 1,25.
- Cascata di adattamento: 1 colonna → 2 colonne → riduzione font fino ai minimi → avviso.
- Avviso se non entra nemmeno ai minimi: export bloccato finché non si riduce/riorganizza il contenuto.
- Badge di stato sempre visibile (es. "2 colonne · 10pt") e override manuale del font/layout per canzone.
- Strofe e ritornelli mai spezzati tra colonne o a fine pagina.

### 2.4 Formattazione

- Stili **per ruolo**, non rich text: titolo, autore, accordi, testo, ritornello, commento, etichette sezione.
- Grassetto/corsivo assegnati ai ruoli (configurabili in `config/defaults.json`).
- Colori: colore accordi, colore testo, colore commento; palette predefinita di 8 colori (custom = P1).

### 2.5 Export e persistenza

- Export PDF via **Stampa → Salva come PDF** (Chromium/Chrome come riferimento; istruzioni in UI per margini/intestazioni/scala).
- Import da `.cho`, `.crd`, `.json`; export in `.cho` e `.json`.
- Autosave locale (localStorage) con debounce; nessun account, nessun server.
- Il PDF esportato: una pagina, testo vettoriale selezionabile, font incorporati, metadati titolo.

### 2.6 Import da testo incollato (implementato)

- Dialog "Incolla testo": incolla da sito (Ultimate Guitar, Accordi e Spartiti, …) o ChordPro già valido.
- Conversione generica basata su grammatica (non per-sito): accordi sopra il testo allineati per colonne → inline; notazione internazionale e italiana (`MIm`, `LAm7`, `DO7+`, `MIm/RE`); intestazioni sezione; righe di soli accordi come grid/intro.
- Contorno scartato (principio: entra solo l'essenziale, il resto si aggiunge a mano): tablature, paginazione (`Page 1/2`), righe decorative, anno/album.
- Titolo/artista riconosciuti dalle pagine UG (prima riga con marcatore "Chords"/"Tabs" → `{title}`, riga breve successiva → `{subtitle}`).
- `Capo`/`Tuning` e annotazioni `(instrumental)`, `(quick fade)`, `(2x)` → `{comment}`.
- Dizionari e pattern in `config/import.json` (sezioni, metadati, metadati senza separatore, rumore, marcatori titolo), estendibili senza toccare la logica.
- Riepilogo e avvisi prima di sostituire il sorgente (correzione manuale immediata in editor).

### 2.7 Non-obiettivi P0

- Nessuna libreria/setlist, nessuna trasposizione, nessuna notazione, nessun sync, nessuna app Android, nessun MCP.

## 3. P1 — miglioramenti successivi

- **Trasposizione e capo** (trasposizione degli accordi, capo tasti).
- **Auto-grow** del font per canzoni molto corte (riempire meglio la pagina).
- **Formati pagina extra**: Letter, formati tablet (es. 16:10).
- **CodeMirror 6** con evidenziazione `[Am]` e `{direttive}`.
- **Export automatico** con Playwright headless (batch, download diretto).
- **PWA** installabile e offline; tema scuro per l'editor.
- Più font e colori custom.

## 4. P2 — backlog

- Libreria canzoni (Dexie/IndexedDB) e ricerca.
- Setlist/canzonieri multipagina con indice e copertina (qui torna utile `break-before: page`).
- Notazione: melodie via ABC/abcjs; spartiti via MusicXML/OSMD.
- Diagrammi accordi e voicing; tablature.
- **Import da PDF** (valutazione): estrazione testo con pdf.js → stessa pipeline copia-incolla. Limiti: il testo PDF può avere ordine di lettura alterato, colonne multiple, accordi posizionati graficamente e non nel layer testuale; i PDF scansionati richiederebbero OCR (fuori scope). Fattibile per PDF "testo nativo" con chord sheet semplice, da valutare solo dopo l'import testuale.
- Sync/cloud opzionale; esposizione MCP per chatbot/AI.
- App Android via Capacitor.

## 5. Comportamento overflow (riepilogo)

1. 1 colonna al font scelto.
2. Overflow → 2 colonne (se `autoColumns`).
3. Overflow o troppi wrap → riduzione font a passi verso i minimi.
4. Overflow ai minimi → avviso chiaro e export bloccato; suggerimenti: ridurre testo, 2 colonne manuali, cambiare layout.

Nessun taglio silenzioso, nessuna seconda pagina automatica.

## 6. Criteri di accettazione del POC

- Una canzone di lunghezza tipica (4–6 strofe + ritornello) entra in **una pagina A4** con testo ≥ 10pt e accordi ≥ 9pt.
- Una canzone lunga attiva automaticamente le 2 colonne e resta in una pagina; se non basta, appare l'avviso.
- Il PDF esportato ha **1 pagina**, formato A4, testo selezionabile, accordi allineati alla sillaba, font incorporati.
- Import/export `.cho` conserva testo, accordi, sezioni e direttive non supportate.
- I default sono modificabili solo da `config/defaults.json`, senza toccare il codice.

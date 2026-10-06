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
- Corpo testo 11pt default, minimo 6pt; accordi 10pt default, minimo 5pt; leading 1,25.
- Cascata di adattamento: 1 colonna → 2 colonne → riduzione font fino ai minimi → avviso.
- Avviso se non entra nemmeno ai minimi: export bloccato finché non si riduce/riorganizza il contenuto.
- Badge di stato visibile solo quando non è il default (2 colonne, font ridotto o custom, avviso); a "1 colonna · 11pt" resta nascosto. Override manuale del font/layout per canzone.
- Strofe e ritornelli mai spezzati tra colonne o a fine pagina.

### 2.4 Formattazione

- Stili **per ruolo**, non rich text: titolo, autore, accordi, testo, ritornello, commento, etichette sezione.
- Grassetto/corsivo assegnati ai ruoli (configurabili in `config/defaults.json`).
- Colori: colore accordi, colore testo, colore commento; palette predefinita di 8 colori (custom = P1).

### 2.5 Export e persistenza

- Export PDF via **Stampa → Salva come PDF** (Chromium/Chrome come riferimento; istruzioni margini/intestazioni nel tooltip del pulsante).
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

### 2.7 Trasposizione (implementata)

- Stepper **Trasponi −/+** in toolbar (−11…+11 semitoni); tasti `+`/`−` quando l'editor non è a fuoco; click sul valore per azzerare.
- **Non distruttiva:** cambia solo anteprima e PDF; sorgente nell'editor ed export `.cho` restano invariati. La trasposizione è salvata nelle impostazioni (localStorage/`.json`).
- Accordo: radice e basso trasposti, suffisso invariato (`Am7`, `sus4`, `add9`, `C/G` → basso trasposto); `N.C.` e token non riconosciuti restano intatti.
- Notazione preservata: internazionale e italiana (`MIm` → `FAm`, `LAm` → `SIm`, `MIm/RE` → `FA#m/MI`).
- Diesis/bemolle: eredita lo stile dell'accordo (se ha bemolli usa i bemolli); limite noto: un accordo naturale in tonalità bemolle può uscire con diesis (`C#` invece di `Db`).
- Implementazione in `src/core/transpose.ts` su grammatica condivisa (`splitChord`); l'auto-fit si ricalcola da solo dopo la trasposizione.

### 2.8 Capo (implementato)

- `{capo: N}` è una direttiva di prima classe: campo `capo` nel `SongDocument` (come `title`/`subtitle`), assente = brano senza capo; valori arabi e romani (`{capo: V}` → 5).
- L'import converte le righe capo riconosciute in `{capo: N}` ("Capo 3", "capo at V", "Capotasto IV"); se non interpretabili restano `{comment: ...}`.
- **Capo visualizzato = C0 + T**, mostrato sotto il titolo solo se > 0:
  - con capo: le forme restano quelle scritte, si sposta il capo (`Capo 2`, +2 → forme invariate e "Capo 4");
  - se `C0 + T < 0`: capo 0, riga omessa, accordi trasposti giù di `|C0+T|`;
  - senza capo: trasposizione classica degli accordi, nessuna riga.
- Editor ed export `.cho` restano invariati (il campo vive nel sorgente: si imposta scrivendo `{capo: 2}`).
- Riga lunga: parole spezzabili in emergenza e grid di accordi che va a capo (`paper.css`).

### 2.9 Import da PDF (implementato)

- "Importa file" accetta `.pdf`: estrazione del testo con `unpdf` (MIT, pdf.js; dynamic import, non pesa sul bundle principale), poi stessa pipeline copia-incolla con revisione nell'ImportDialog.
- Ricostruzione per coordinate (`x`/`y`): raggruppa per riga, ordina per colonna e ricrea gli spazi dai vuoti, così l'allineamento accordo/sillaba è preservato; rileva le 2 colonne e legge prima la sinistra.
- Limiti: solo PDF con layer di testo (scansioni/OCR esclusi, avviso); PDF molto anomali possono richiedere correzione a mano nella revisione.
- Funzioni pure `itemsToLines`/`splitColumns` in `src/core/pdf.ts`, testate con item sintetici.

### 2.10 Non-obiettivi P0

- Nessuna libreria/setlist, nessuna notazione, nessun sync, nessuna app Android, nessun MCP.

## 3. P1 — miglioramenti successivi

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
- ~~Import da PDF~~ (implementato in §2.9, solo PDF con testo).
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
- La trasposizione cambia anteprima e PDF ma non il sorgente né l'export `.cho`.
- I default sono modificabili solo da `config/defaults.json`, senza toccare il codice.

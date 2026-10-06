# Stack tecnologico e generazione PDF

**Data:** 2026-10-06
**Stato:** proposta condivisa. Le voci marcate "scelta condivisa" sono state concordate; le alternative restano documentate come opzioni rivalutabili.
**Riferimenti:** `doc/sota.md` (stato dell'arte), `doc/features.md` (funzionalità), `config/defaults.json` (default di progetto).

---

## 1. Requisiti e vincoli

- Artefatto finale: **PDF A4 verticale, una canzone per pagina**, leggibile su qualsiasi tablet senza app dedicata.
- L'app è un **editor/compilatore**, non un viewer: serve solo a chi crea i PDF.
- **Margini risicati** per sfruttare tutto il foglio (default 5 mm).
- Minimalità e manutenibilità; POC utilizzabile prima di ogni estensione.
- **Nessun backend obbligatorio** per il POC.
- Licenza **MIT + donazioni PayPal**; eventuale vendita successiva come servizio/hosted.
- Android in seguito con poco sforzo; MCP/chatbot **solo concettuale** per ora.

## 2. Architettura

```
Editor (Svelte 5 + Vite + TypeScript, client-side)
   │  sorgente ChordPro (subset)
   ▼
Parser ChordPro-subset  ──►  SongDocument (modello interno, JSON-serializzabile)
                                  │
                                  ▼
                       Renderer HTML/CSS (pagina A4 in mm)
                                  │
                                  ▼
                       Auto-fit (misura DOM reale, wrap incluso)
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
   Anteprima live (stesso HTML)            Export PDF (print CSS, Chromium)
              │
              ▼
   Persistenza: localStorage + import/export .cho/.json
```

Punti chiave:
- **Un solo renderer** per anteprima ed export: quello che vedi è quello che stampi.
- **Modello separato dal renderer**: in futuro si può aggiungere un renderer Typst o un export server-side senza riscrivere l'editor.
- **SongDocument JSON-serializzabile**: base concettuale per un futuro MCP server (ID stabili, nessuna dipendenza dalla UI).

## 3. Scelte di stack

| Area | Scelta condivisa | Alternative valutate | Motivo |
|---|---|---|---|
| UI | **Svelte 5 + Vite + TypeScript** | Vue 3, Vanilla TS, React | Bundle minimo, SPA semplice, ottimo con Capacitor in futuro |
| Formato sorgente | **Subset ChordPro + parser proprio (MIT)** | ChordSheetJS (GPL-2.0), formato custom | Interoperabilità con l'ecosistema; nessun copyleft nel core |
| Rendering pagina | **HTML/CSS con misure in mm** | Typst, SVG | Unica resa per preview ed export; nessuna doppia implementazione |
| Export PDF (P0) | **Print CSS + dialogo stampa (Chromium riferimento)** | Playwright headless, WeasyPrint, Typst WASM | Zero backend, subito funzionante, testo vettoriale e font incorporati |
| Export PDF (P1) | Playwright/Chromium headless sullo stesso HTML | Typst WASM | Export batch/automatico senza riscrivere il layout |
| Persistenza (P0) | **localStorage + file `.cho`/`.json`** | Dexie/IndexedDB, SQLite WASM | Una sola canzone; il DB serve quando arriverà la libreria |
| Font | **3 font OFL bundlati**: Inter (sans), Source Serif 4 (serif), JetBrains Mono (editor) | Font di sistema | Embedding nel PDF e resa uniforme |
| Android (P1/P2) | PWA ora, **Capacitor** dopo | Tauri 2 | Riuso 100% del codice web |
| Configurazione | **`config/defaults.json`** | Valori nel codice | Default modificabili senza toccare il codice |

## 4. Generazione PDF (dettaglio)

### 4.1 Scelta condivisa: print CSS con Chromium come riferimento

- `@page { size: 210mm 297mm; margin: 5mm }` (valori da `config/defaults.json`).
- `break-before: page` per il futuro multi-canzone; `break-inside: avoid` su strofe/ritornelli.
- Il PDF risultante ha **testo vettoriale selezionabile e font incorporati**; una volta generato è portabile su qualsiasi dispositivo.
- Limite noto: il dialogo di stampa può alterare scala e margini. Mitigazione: istruzioni in UI ("margini: default/nessuno, intestazioni disattivate, scala 100%") e dimensioni definite in mm dal CSS.
- Browser target: **Chromium/Chrome per l'export**; Firefox/Safari best-effort (differenze nel print CSS).

### 4.2 Alternative documentate (non adottate ora)

| Opzione | Tradeoff | Quando rivalutarla |
|---|---|---|
| Playwright/Chromium headless | Stessa resa del browser, automatizzabile e batch; richiede Node/server | P1, export automatico o multi-canzone |
| Typst (WASM client o CLI server) | Qualità tipografica alta e deterministica; richiede un template separato (doppio motore) | Se il print CSS non basta o serve export on-device senza dialogo |
| WeasyPrint (Python) | Paged media eccellente; rendering diverso dal browser → divergenza preview/PDF | Solo se l'export diventa server-side e si accetta la doppia resa |
| ChordPro CLI (Perl) | Allineamento accordi nativo; server-side, stile poco flessibile | Solo come riferimento/import, non come motore |
| pdf-lib / jsPDF | Utili per post-processing (merge, metadati); layout a mano | Integrazioni future |

## 5. Auto-fit e overflow (algoritmo)

1. Render della pagina A4, 1 colonna, al font scelto.
2. Misura dell'altezza **renderizzata** (righe reali, wrap incluso).
3. Se sfora e `autoColumns`: passa a 2 colonne e rimisura. Le colonne sono la leva principale di capienza per le liriche (righe corte).
4. Se sfora ancora: riduci il font a passi fino a `textPtMin`/`chordPtMin`, rimisurando a ogni passo.
5. Se sfora ancora: badge di avviso; export bloccato finché non si riduce il contenuto o si cambia layout.

Vincoli di qualità:
- La riga accordo+testo non dovrebbe andare a capo nella colonna; se accade troppo spesso, il font va ridotto.
- Strofe e ritornelli mai spezzati (`break-inside: avoid`).
- Isteresi sul cambio di layout per evitare flicker durante la digitazione.
- Badge visibile dello stato ("2 colonne · 10pt") e override manuale per canzone.
- Tutti i parametri sono in `config/defaults.json`.

## 6. Rendering degli accordi sul testo

- Ogni coppia accordo/sillaba è uno **span inline**; l'accordo è posizionato sopra la sillaba con line-height dedicata (non `position: absolute`), così il wrapping resta corretto.
- Sezioni tipizzate (strofa, ritornello, bridge, commento) con stili per ruolo, non rich text arbitrario.
- I testi senza accordi sono il caso limite naturale (nessuno span accordo).

## 7. Configurazione (`config/defaults.json`)

Fonte unica dei default; l'app non deve hardcodare questi valori. Chiavi principali:

| Sezione | Contenuto |
|---|---|
| `page` | formato, orientamento, dimensioni mm, margini e loro range |
| `layout` | font pt default/min/max, leading, gap sezioni, colonne, autoColumns/autoFit/autoGrow |
| `typography` | font bundlati (OFL), font editor, bold/italic per ruolo |
| `colors` | colori per ruolo (testo, accordi, ritornello, commento) + palette |
| `export` | browser di riferimento, best-effort, scala, metadati PDF |
| `storage` | driver, debounce autosave, estensioni import/export |

## 8. Roadmap tecnica

- **P0:** editor singola canzone, anteprima A4, auto-fit, export print CSS, persistenza locale, import/export file.
- **P1:** trasposizione/capo, auto-grow per canzoni corte, formati pagina extra (Letter/tablet), CodeMirror 6, export Playwright, PWA, tema scuro.
- **P2:** lista canzoni (Dexie), setlist, indice/copertina, notazione (ABC/abcjs), diagrammi accordi, sync, MCP, app Android Capacitor.

## 9. Opzioni residue

- Auto-ingrandimento del font per canzoni corte (`autoGrow`, default `false`).
- Formato pagina alternativo al solo A4 verticale.
- Motore PDF alternativo (Typst) se l'export browser non soddisfa.
- Estensione del profilo ChordPro supportato.

## 10. Nota MCP / AI (concettuale)

Il modello `SongDocument` è indipendente da UI e serializzazione: ID stabili, JSON esportabile/importabile. Questo basta come base per un futuro MCP server (es. "leggi/crea/aggiorna canzone", "esporta PDF"), ma **nessuna implementazione in questa fase**.

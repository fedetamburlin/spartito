L'obiettivo di questo progetto è creare una webapp per la impaginazione di testi e accordi e spartiti musicali. 
La volontà è poter impaginare in maniera efficace, comoda e pulita dei testi di canzoni in maniera strutturata, potendo avere a disposizione anche gli accordi, in modo da generare questi spartiti/canzonieri in maniera compatta, con l'obiettivo di disporre di uno strumento per creare dei pdf visualizzabili effciacemente su un tablet su una sola pagina senza dover cambiare pagin a mano a metà canzone. Massime info di uan canzone in singola pagina, tra una canzone e l'altra si può cambiare pagina. Inizialmente l'app dovrà coprire testo e accordi; la possibilità di mostrare piccole melodie, tablature o voicing di accordi è secondaria e verrà valutata solo dopo il POC.
Vorrei fosse un'app minimale sia come possibilità che come interfaccia, pulita e mantenibile, con possibilità successivamente di aggiungere altre funzionalità se necessario. Inizialmente ci dobbiamo concentrare sul definire le fuznionalità base e generare codice semplice per un proof of concept utilizzabile ma base.

Dovrà essere distribuibile come una webapp, sia deployabile come sito web ma poi successivamente anche app android con poco sforzo, quindi framework distribuibili facilemente. Da tenere in conto la possibilità di esporre mcp server o commodity per chatbot e ai, ma SOLO a livello concettuale, non da fare al momento.

Inizialmente dovrà essere eseguita una indagine sulle soluzioni attuali per impaginazione di testi con accordi, sia proprietarie che opensource, e redatto  un file compatto, tecnico e schematico dello stato dell'arte, almeno 3 soluzioni proprietarie e 5 open source con relativi link alla documentazione ufficiale e pro e contro. Sarà salvato su doc/sota.md. Formato del documento: data della ricerca, per ogni soluzione link alla documentazione ufficiale e 2-3 righe di pro/contro. Time-box: una sessione di ricerca.

Una volta fatto ciò si procederà alla definizione dello stack tecnologico e come creare questi pdf, ad esempio passando da html o altri formati(da documentare schematicamente in doc/stack.md) e delle funzionalità base dell'app (doc/features.md). Tu crea un insieme di idee che poi decideremo insieme, e solo successivamente andrai a scrivere questa documentazione preliminare su stack e features, in base al grado di difficoltà, la maturità dei framework e anche considerando alcune soluzioni viste nei software analizzate. Questi documenti conterranno opzioni con relativi tradeoff e raccomandazioni, non decisioni prese a priori: la scelta finale sarà condivisa.

Non scrivere codice finchè non siamo arrivati a redarre questa documentazione iniziale insieme.

## Domande aperte (risolte il 2026-10-06 — vedi "Decisioni condivise" e doc/)
- Formato sorgente → subset ChordPro con parser proprio MIT (doc/stack.md)
- Generazione PDF → print CSS nel browser, Chromium come riferimento; Playwright/Typst sono opzioni P1 (doc/stack.md)
- Salvataggio canzoni → localStorage + import/export `.cho`/`.json`; Dexie quando arriverà la libreria (P1)
- Canzone che non entra → 1→2 colonne, poi riduzione font ai minimi (10pt testo / 9pt accordi), poi avviso; mai spezzata (doc/features.md)
- Notazione/melodie/voicing → rimandata al post-POC; ABC/abcjs e MusicXML/OSMD nel backlog P2 (doc/features.md)

## Decisioni condivise (2026-10-06, vedi doc/)
- **PDF-first:** l'artefatto finale è un PDF A4 verticale, una canzone per pagina; l'app è editor/compilatore, nessun viewer dedicato.
- **POC:** una sola canzone, una pagina; colonne come leva di capienza (auto 1→2), margini risicati (default 5 mm), spaziatura compatta (doc/features.md).
- **Formato:** subset ChordPro documentato; direttive non supportate preservate all'export.
- **Stack:** Svelte 5 + Vite + TypeScript, client-side, nessun backend; export PDF via print CSS; persistenza localStorage + file (doc/stack.md).
- **Default:** in `config/defaults.json`, non hardcoded nel codice.
- **Licenza:** MIT + donazioni PayPal; evitare dipendenze GPL nel core.
- **Extra:** `doc/market.md` (analisi minima mercato/monetizzazione) non richiesto dal brief.
- **Stato:** documentazione iniziale completata (`doc/sota.md`, `doc/stack.md`, `doc/features.md`); via libera al POC. Da validare con uno spike: resa print CSS su canzone lunga e passaggio automatico a 2 colonne.




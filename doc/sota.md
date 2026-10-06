# SOTA — Impaginazione testi con accordi e spartiti

**Data ricerca:** 2026-10-06
**Metodo:** una sessione di ricerca web; link a documentazione/pagina ufficiale, verificati al fetch salvo nota.
**Obiettivo:** mappare l'esistente per (a) formato sorgente delle canzoni, (b) impaginazione e generazione PDF/canzionieri, (c) lettura su tablet.
**Criteri di lettura per il POC:** input testuale strutturato, output PDF "una canzone per pagina", riutilizzabilità in webapp (JS o backend leggero), licenza, maturità.
**Nota:** documento di stato dell'arte, non contiene decisioni. Stack e features verranno discussi e documentati a parte (`doc/stack.md`, `doc/features.md`).

---

## 1. Soluzioni proprietarie

### 1. SongBook (LinkeSOFT) — riferimento più vicino al caso d'uso
- **Tipo/Licenza:** proprietario, acquisto una tantum per piattaforma (demo disponibile)
- **Doc ufficiale:** [ChordPro Format / manuale](https://www.linkesoft.com/songbook/chordproformat.html) (verificato)
- **Cosa fa:** gestisce canzonieri con accordi in formato ChordPro, con trasposizione, setlist e stampa impaginata.
- **Pro:** formato ChordPro nativo con direttive di impaginazione (`{new_page}`) pensate apposta per il caso "una canzone per pagina"; multipiattaforma desktop+mobile; setlist, autoscroll, auto-zoom, librerie accordi.
- **Contro:** UI datata e chiusa; nessuna API/embed perciò non è una base riusabile; app nativa, non web.
- **POC:** dimostra che un modello dati ChordPro + direttive di pagina copre l'intero requisito. Da imitare il modello, da non adottare l'ecosistema chiuso.

### 2. OnSong — riferimento UX per live/setlist ed export
- **Tipo/Licenza:** proprietario, freemium con abbonamenti (~30–60 $/anno)
- **Doc ufficiale:** [Sito/pricing](https://www.onsongapp.com/pricing/) (verificato)
- **Cosa fa:** libreria/editor di canzoni con accordi per l'esecuzione dal vivo, con stampa/export di setlist.
- **Pro:** flusso "canzone = vista a schermo intero" con autoscroll, transpose/capo e pedali; gestione libri/setlist e appendice diagrammi accordi; export/stampa.
- **Contro:** ecosistema solo Apple (Android assente); funzioni chiave dietro abbonamento; piattaforma chiusa.
- **POC:** fonte di requisiti UX (setlist, vista singola, resa accordi). Non riusabile come motore.

### 3. forScore — riferimento UX per lettura PDF su tablet
- **Tipo/Licenza:** proprietario, a pagamento (tier Pro)
- **Doc ufficiale:** [Portale supporto](https://forscore.co/portal/) (verificato)
- **Cosa fa:** lettore/annotatore di PDF di spartiti, con setlist, annotazioni e page-turn rapido.
- **Pro:** gestione PDF eccellente (caching, cambio pagina istantaneo), annotazioni con pencil, controlli hands-free (pedali/MIDI).
- **Contro:** solo PDF, nessun formato sorgente con accordi; solo Apple; non genera né impagina contenuti.
- **POC:** modello da imitare per la lettura su tablet; non è un motore di impaginazione.

### 4. Ultimate Guitar — standard di fatto del formato "testo + accordi"
- **Tipo/Licenza:** proprietario, freemium (catalogo community + abbonamento Pro)
- **Doc ufficiale:** [About](https://www.ultimate-guitar.com/about/) (verificato)
- **Cosa fa:** piattaforma con catalogo enorme di tab/accordi, player, transpose e autoscroll.
- **Pro:** enorme volume di contenuti e formato testuale riconosciuto ovunque; trasposizione/autoscroll come riferimento funzionale; app multipiattaforma.
- **Contro:** formato community non normalizzato; nessuna impaginazione/canzioniera PDF; contenuti/marchi con vincoli di licenza.
- **POC:** utile come riferimento di formato in input e pattern transpose/autoscroll; da evitare come dipendenza.

### 5. Guitar Pro — riferimento per spartiti/tab ed export PDF
- **Tipo/Licenza:** proprietario, licenza perpetua desktop; app mobile separata
- **Doc ufficiale:** [Guida utente GP8](https://www.guitar-pro.com/docs/gp8/basics) (verificato)
- **Cosa fa:** editor/lettore di tablature e spartiti con playback ed export.
- **Pro:** export PDF/PNG/SVG, MusicXML, MIDI, ASCII; notazione + tab + diagrammi accordi; ecosistema consolidato.
- **Contro:** overkill per testo+accordi; formato proprietario e app pesante; nessun concetto di canzoniere "una canzone/pagina".
- **POC:** riferimento per il futuro secondario (tab/voicing); non per il core.

### Altri riferimenti proprietari (secondari, una riga)
| Soluzione | Perché è secondaria | Link |
|---|---|---|
| ProPresenter | presentazione live (worship), non produce canzonieri PDF | [renewedvision.com/propresenter](https://www.renewedvision.com/propresenter) (verificato) |
| Soundslice | notazione interattiva web con audio; focalizzata su learning, export PDF non è il core | [soundslice.com](https://www.soundslice.com/) (verificato) |
| Sibelius / Dorico | engraving professionale di partiture; costo e scala non giustificati per testo+accordi | [avid.com/sibelius](https://www.avid.com/sibelius) (verificato) |
| Finale | prodotto EOL (dismissione annunciata, crossgrade a Dorico); solo nota di mercato | [finalemusic.com](https://www.finalemusic.com/) (verificato) |
| Chordify | genera accordi da audio (AI); non riguarda impaginazione/PDF | [chordify.net](https://chordify.net/) (non verificato, HTTP 403) |

---

## 2. Soluzioni open source

### 1. ChordPro (formato + implementazione di riferimento) — standard de facto
- **Licenza / Tech:** formato aperto; reference implementation Perl sotto Artistic License 2.0
- **Doc ufficiale:** [chordpro.org](https://www.chordpro.org/) (verificato); [repo GitHub](https://github.com/ChordPro/chordpro) (verificato)
- **Cosa fa:** formato testuale (`[Am]` inline + direttive `{title:}`, `{start_of_chorus}`, `{new_page}`) con CLI che genera PDF nativamente (anche HTML/testo).
- **Pro:** PDF diretto senza toolchain esterna; direttive per songbook (TOC, copertine, salti pagina) e diagrammi accordi; ABC integrato; adottato da molti editor/app.
- **Contro:** implementazione di riferimento in Perl, non riusabile in JS lato client; GUI basilare; personalizzazione layout meno fine di LaTeX.
- **POC:** adottare il **formato** come input è la scelta più interoperabile; la CLI è utilizzabile solo come backend server-side.

### 2. ChordSheetJS — parsing/rendering in JS, candidato lato client
- **Licenza / Tech:** **GPL-2.0**; TypeScript/JS (browser + Node)
- **Doc ufficiale:** [repo GitHub](https://github.com/martijnversluis/ChordSheetJS) (verificato); [API docs](https://martijnversluis.github.io/ChordSheetJS/)
- **Cosa fa:** parser e formatter di fogli di accordi (ChordPro, chords-over-words, Ultimate Guitar) con output testo, HTML e PDF (jsPDF, beta).
- **Pro:** 100% riusabile in webapp e packaging Android (Capacitor); `MeasuredHtmlFormatter` per posizionare gli accordi con precisione; trasposizione, capo, notazioni alternative.
- **Contro:** licenza GPL-2.0 (copyleft, vincolo per prodotti chiusi); PDF beta; nessuna direttiva di impaginazione multi-pagina (`new_page`, colonne).
- **POC:** candidato centrale lato client: parse → HTML misurato → stampa/PDF via browser; verificare il vincolo di licenza.

### 3. songs (pacchetto LaTeX) — riferimento di qualità tipografica
- **Licenza / Tech:** GPL-2.0+; LaTeX; sorgente `.crd`/`.tex`, output PDF
- **Doc ufficiale:** [songs.sourceforge.net](https://songs.sourceforge.net/) e [documentazione](https://songs.sourceforge.net/songsdoc/songs.html) (verificato)
- **Cosa fa:** suite LaTeX per canzonieri con accordi, libro testi, libro accordi e slide da un unico sorgente.
- **Pro:** output PDF di alta qualità; gestione nativa di più canzoni per volume e impaginazione editoriale; diffuso nell'ambiente canzonieri.
- **Contro:** richiede toolchain LaTeX e backend; ultima release 3.1 (2018), manutenzione ferma; non riusabile in JS.
- **POC:** riferimento per la resa dell'output; non adatto come motore web.

### 4. Patacrep — pipeline canzonieri (ChordPro → LaTeX → PDF)
- **Licenza / Tech:** GPL-2.0; Python 3 + Jinja2, basata su songs LaTeX
- **Doc ufficiale:** [docs su ReadTheDocs](https://patacrep.readthedocs.io/) (verificato; il sito `patacrep.com` non risponde in questa sessione)
- **Cosa fa:** catena di compilazione per canzonieri (community francofona/italiana) con template ed estensioni tab/partiture LilyPond.
- **Pro:** integra già ChordPro→LaTeX; gestione multi-canzone e template; raccolta `patadata` e ricetta consolidata.
- **Contro:** community piccola, docs solo in francese; dipende da LaTeX/Python; strumenti web/GUI in sviluppo o non mantenuti.
- **POC:** utile come modello di pipeline e struttura canzoniere; poco riusabile in webapp.

### 5. abcjs — notazione via ABC in JS (futuro melodie)
- **Licenza / Tech:** MIT; JavaScript (browser/Node), input ABC, output SVG + MIDI
- **Doc ufficiale:** [abcjs.net](https://www.abcjs.net/) / [docs.abcjs.net](https://docs.abcjs.net) (verificato)
- **Cosa fa:** rende notazione musicale da stringhe ABC direttamente in pagina, con editor e playback.
- **Pro:** licenza permissiva e integrazione facilissima; manutenzione attiva; complementare a ChordPro (che supporta già ABC).
- **Contro:** copre solo la notazione (melodia), non impagina testi+accordi; aggiunge un formato da gestire.
- **POC:** opzione futura a basso costo per piccole melodie senza cambiare il formato sorgente.

### 6. VexFlow — motore di notazione JS di basso livello
- **Licenza / Tech:** MIT per la libreria (VexTab free solo non-commerciale); JS, Canvas/SVG
- **Doc ufficiale:** [vexflow.com](https://www.vexflow.com/) e [repo GitHub](https://github.com/0xfe/vexflow) (verificato)
- **Cosa fa:** API di engraving per note, tablature e diagrammi accordi (`VexChords`) nel browser.
- **Pro:** molto maturo ed esteso; adatto a editor interattivi; diagrammi di accordi pronti.
- **Contro:** basso livello (molto lavoro per un layout completo); VexTab a pagamento per uso commerciale; eccessivo per il solo testo+accordi.
- **POC:** prematuro per il core; possibile base per tablature/voicing in fase 2.

### 7. OpenSheetMusicDisplay (OSMD) — MusicXML nel browser
- **Licenza / Tech:** BSD-3-Clause; TypeScript, input MusicXML, rendering via VexFlow, anche headless su Node
- **Doc ufficiale:** [opensheetmusicdisplay.org](https://opensheetmusicdisplay.org/) e [repo GitHub](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay) (verificato)
- **Cosa fa:** visualizza spartiti MusicXML completi nel browser (o server-side) con supporto tablature.
- **Pro:** licenza permissiva, ottima per app; rendering server-side headless (utile per PDF); sviluppo attivo.
- **Contro:** richiede MusicXML (formato pesante per testo+accordi); non gestisce l'impaginazione "canzone per pagina"; è un renderer, non un editor.
- **POC:** solo per il futuro supporto spartiti/partiture, non per il caso principale.

### 8. LilyPond — engraving testuale di alta qualità
- **Licenza / Tech:** GPL-3.0; C++/Scheme, sorgente `.ly`, output PDF/SVG/MIDI
- **Doc ufficiale:** [lilypond.org](https://lilypond.org/) (verificato)
- **Cosa fa:** compila sorgenti testuali in spartiti di qualità tipografica professionale, con supporto a voce, tastiere, lead sheet e tablature.
- **Pro:** qualità editoriale; sorgente versionabile; molto attivo; adatto anche a partiture complete.
- **Contro:** curva di apprendimento ripida; integrazione pesante in webapp; sproporzionato per testo+accordi.
- **POC:** solo eventuale backend per spartiti complessi in futuro.

### 9. MuseScore Studio — editor di notazione completo
- **Licenza / Tech:** GPL-3.0; C++/Qt, desktop, input GUI/MusicXML/MIDI, output PDF/PNG/MusicXML
- **Doc ufficiale:** [musescore.org](https://musescore.org/) (verificato)
- **Cosa fa:** editor di spartiti completo e gratuito, con export PDF.
- **Pro:** standard di fatto per la notazione, community enorme; import/export MusicXML.
- **Contro:** applicazione desktop GUI; nessun uso headless semplice in webapp; non pensato per testo+accordi.
- **POC:** non riusabile nel flusso web; eventuale editor umano per spartiti allegati.

### Altri open source (secondari, una riga)
| Soluzione | Perché è secondaria | Link |
|---|---|---|
| OpenSong | gestione/lead sheet + proiezione worship, desktop e formato proprietario; buone idee su metadati | [opensong.org](https://www.opensong.org/) (verificato) |
| OpenLP | proiezione live con import ChordPro/OpenSong/CCLI; non genera PDF canzoniere | [manual.openlp.org](https://manual.openlp.org/) (verificato) |
| Quelea | proiezione con "stage view"; desktop Java, licenza da riconfermare sul repo | [quelea.org](https://quelea.org/) e [GitHub](https://github.com/quelea-projection/Quelea) (verificato) |
| TuxGuitar | editor tab multi-formato (Guitar Pro) con app Android; non testo+accordi | [tuxguitar.app](https://www.tuxguitar.app/) (verificato) |
| Frescobaldi | IDE desktop per LilyPond; nessun riuso web diretto | [frescobaldi.org](https://www.frescobaldi.org/) (verificato) |

---

## 3. Sintesi comparativa

| Soluzione | Lic. | Input | Output PDF | Riuso in webapp | Rilevanza POC |
|---|---|---|---|---|---|
| SongBook | prop. | ChordPro | stampa impaginata | no (nativa) | modello dati/UX |
| OnSong | prop. | vari/ChordPro | stampa/export | no | UX setlist/live |
| forScore | prop. | PDF | — | no | UX lettura tablet |
| Ultimate Guitar | prop. | testo community | no | no | formato di input |
| Guitar Pro | prop. | .gp/MusicXML | sì | no | fase 2 tab |
| ChordPro | Artistic-2.0 | ChordPro | sì (nativo) | backend | formato + direttive |
| ChordSheetJS | GPL-2.0 | ChordPro/UG/over-words | sì (beta) | JS nativo | motore client |
| songs (LaTeX) | GPL-2.0+ | .crd/LaTeX | sì (alta qualità) | no (LaTeX) | modello di output |
| Patacrep | GPL-2.0 | ChordPro/LaTeX | sì | no | pipeline multi-canzone |
| abcjs | MIT | ABC | SVG (via print) | JS nativo | fase 2 melodie |
| VexFlow | MIT* | API/VexTab | SVG (via print) | JS nativo | fase 2 tab/voicing |
| OSMD | BSD-3 | MusicXML | SVG/PNG headless | JS/Node | fase 2 spartiti |
| LilyPond | GPL-3.0 | .ly | sì (alta qualità) | backend | fase 2 spartiti |
| MuseScore | GPL-3.0 | GUI/MusicXML | sì | no | editor umano |

\* libreria MIT, ma il linguaggio VexTab è free solo per uso non commerciale.

---

## 4. Letture per il POC (osservazioni, non decisioni)

- **Formato sorgente:** ChordPro è il punto di convergenza (SongBook, ChordPro CLI, import in OpenLP, ChordSheetJS). Un formato testuale con direttive copre metadati, sezioni, trasposizione e salti pagina senza inventare nulla di nuovo.
- **Due famiglie per il PDF:** (a) testo → LaTeX/songs o CLI ChordPro, PDF server-side di alta qualità ma poco interattivo e con toolchain pesante; (b) markup → HTML "misurato" (ChordSheetJS) o SVG (abcjs/VexFlow/OSMD) nel browser + CSS di stampa, più riusabile per webapp/Android ma con più lavoro di layout.
- **Requisito "una canzone per pagina":** tutti gli strumenti maturi hanno direttive o pratiche equivalenti (`{new_page}` ChordPro, `\beginsong` songs). Il vincolo vero sarà la gestione della canzone che eccede la pagina, non la generazione del PDF.
- **UX tablet ricorrente:** canzone a schermo intero, setlist, page-turn anche con pedale, trasposizione e autoscroll (OnSong, forScore, SongBook, UG).
- **Licenze:** ChordSheetJS è GPL-2.0 (attenzione se il prodotto sarà chiuso); abcjs/VexFlow/OSMD permissive (MIT/BSD); CLI ChordPro e songs/Patacrep GPL/Artistic (uso server-side OK).
- **Futuro melodie/tab/voicing:** ABC (già nel formato ChordPro) + abcjs MIT è la via a minor costo; MusicXML + OSMD (headless possibile) per spartiti veri; Guitar Pro come sorgente esterna.
- **Maturità:** ChordPro, abcjs, VexFlow, MuseScore, LilyPond attivi; songs fermo al 2018; Patacrep community piccola con docs in francese.

---

## 5. Domande aperte (da non decidere prima della revisione della SOTA)

1. **Formato sorgente delle canzoni:** testo strutturato (ChordPro?), import da altri formati, editor visuale?
2. **Generazione PDF:** da quale formato intermedio (HTML/stampa browser, LaTeX, CLI ChordPro, SVG)?
3. **Persistenza:** dove vengono salvate le canzoni (locale, file, backend, sync)?
4. **Overflow di pagina:** cosa fare se una canzone non entra in una pagina?
5. **Notazione futura:** se e come supportare melodie/tablature/voicing (ABC, MusicXML, tab)?

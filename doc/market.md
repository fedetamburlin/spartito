# Mercato e monetizzazione (nota minima)

**Data ricerca:** 2026-10-06 — fonte: una sessione di ricerca su pagine ufficiali/App Store; dati non pubblici segnalati.

## Comparabili

| Prodotto | Modello | Prezzo | Segnale |
|---|---|---|---|
| iReal Pro | one-time | $21,99 | 2M+ musicisti dichiarati, 4.8★ |
| forScore | one-time + Pro | $24,99 + $14,99/anno | ~43k rating, #1 paid iPad music |
| OnSong | freemium/abbonamento | $29,99–59,99/anno | 400k+ utenti dichiarati, solo Apple |
| SongBook (LinkeSOFT) | one-time per piattaforma | non pubblico | multipiattaforma, ChordPro nativo |
| BandHelper | SaaS | $16–400/anno | setlist/band management |
| Soundslice | freemium SaaS | $5–20/mese | education/B2B |
| ProPresenter | abbonamento | ~$289/anno/postazione | worship, molto redditizio |
| ChordPro | open source | gratis | 529★, standard del formato |

## Monetizzazione

- **Ads: no.** CPM display ~€2,50 → 100k pageview/mese ≈ €250/mese; per cifre serie servono milioni di impression. Nicchia + adblock.
- **Modelli realistici:** one-time a prezzo contenuto (iReal Pro/forScore) o freemium con tier cloud/hosted; conversioni nicchia 1–5%.
- **Scelta condivisa:** MIT + donazioni PayPal; eventuale vendita successiva come servizio/hosted (non in esclusiva: MIT consente fork commerciali).

## Vincoli

- **Copyright:** mai ospitare testi/accordi di terzi senza licenza (Ultimate Guitar paga gli editori; nell'ambiente worship le licenze passano da CCLI/SongSelect). Modello "bring your own content": l'utente importa/scrive i suoi testi, l'app produce il PDF.
- **Licenze dipendenze:** evitare GPL (es. ChordSheetJS) nel core per non precludere un futuro dual/proprietario; preferire MIT/Apache/BSD (Svelte MIT, Typst Apache-2.0, Playwright Apache-2.0).

## Verdetto

Come business pubblicitario non vale la pena. Come tool personale/open source con donazioni è sostenibile a costi ~zero (client-side, hosting statico). Se in futuro vorrà generare reddito, la strada credibile è un servizio (cloud/batch/template) o una verticalizzazione (worship, scuole, club), non il formato PDF in sé.

# Fanta (PWA)

## Stack
React 19 + TypeScript + Vite 7, react-router (HashRouter). Nessun backend. Package manager: npm (c'è `package-lock.json`, usato dalla CI).

## Architettura
- `public/data/giocatori.json`: dati statici (giocatori e snapshot iniziale dei dati utente), esportati dalle migration Flyway V1.0–V1.5 del progetto originale `../fantamantra` (Quarkus + Postgres).
- `src/store.ts`: sostituisce il DB. Carica il JSON e legge/scrive i dati utente in `localStorage` (chiave `fantamantra.datiUtente.v1`).
- Dati utente: `preferiti`, `spesaMassima`, `priorita`, `acquisti` (MIO/ALTRI con prezzo) e `configAsta` (budget e slot Classico P/D/C/A, Mantra Por/Mov). `normalizzaDatiUtente` mette i default ai campi mancanti, così i backup vecchi restano validi.
- `src/asta.ts`: residuo, slot per reparto e massimo spendibile (residuo meno 1 credito per ogni altro slot libero). Gli slot seguono la modalità attiva nei filtri.
- `src/api.ts`, `src/preferiti.ts`: stessa firma delle vecchie chiamate REST, così i componenti non cambiano. La logica è portata da `GiocatoreService` e `PreferitoService`.
- PWA: `public/manifest.webmanifest` e `public/sw.js` (stale-while-revalidate), registrato in `src/main.tsx` solo in produzione.

## Convenzioni
Naming in italiano, come nel progetto originale. I path pubblici passano da `import.meta.env.BASE_URL`, perché l'app è servita sotto `/Fanta/`.

## Comandi
- `source ~/.nvm/nvm.sh && nvm use 22 && npm run dev`
- `npm run build`, `npx vite preview`

## Hook post-edit
`npx tsc --noEmit` (poi `npm run build` prima del push)

- Icone: `python3 scripts/genera-icone.py` rigenera `public/icons/*`.
- Zoom: bloccato nelle liste (`touch-action: pan-x pan-y` + `user-scalable=no`), gestito in JS solo in `FormazioneModal`.
- La chiave di `localStorage` resta `fantamantra.datiUtente.v1` anche dopo il cambio nome: non rinominarla o si perdono i dati.

## File generati
`dist/` (ignorato da git).

## Note
- `vite.config.ts` → `base: "/Fanta/"` deve corrispondere al nome del repo GitHub.
- Se cambi file statici in modo incompatibile, incrementa `CACHE` in `public/sw.js`.
- Il repo usa la chiave personale `~/.ssh/id_ed25519_github` tramite `core.sshCommand` (config locale del repo: `~/.ssh/config` è di root e non va toccato) e un'identità git locale personale. Non usare le credenziali aziendali.

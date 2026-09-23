# Decisioni

## 2026-09-23 — PWA statica invece di backend ospitato
Serviva l'app sul telefono in giornata, a costo zero. Il backend Quarkus + Postgres (~625 righe) è stato riscritto lato client: dati statici in JSON e dati utente in `localStorage`, con esporta/importa JSON come backup. Hosting su GitHub Pages. Scartati: hosting gratuito del backend (Render + Neon: sleep a freddo, account multipli) e APK nativo con Tauri (Android SDK/NDK da installare, nessun vantaggio per l'utente).

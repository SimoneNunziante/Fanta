import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // Quando subentra una versione nuova del service worker ricarica una volta, cosi' si vede subito
  // l'app aggiornata. Al primo avvio (nessun controller precedente) non serve.
  const avevaController = navigator.serviceWorker.controller != null;
  let ricaricato = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!avevaController || ricaricato) return;
    ricaricato = true;
    window.location.reload();
  });
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: "none" })
    .then((reg) => {
      // Controlla aggiornamenti anche quando si torna sull'app gia' aperta.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
    });
}

import { useEffect } from "react";

/**
 * Tiene lo schermo acceso mentre l'app e' aperta (durante l'asta il telefono non deve andare in standby).
 * Il browser rilascia il blocco quando l'app va in background: lo richiediamo di nuovo al ritorno.
 * Dove la Screen Wake Lock API non c'e' non fa nulla.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let blocco: WakeLockSentinel | null = null;
    let attivo = true;

    async function richiedi() {
      if (!attivo || document.visibilityState !== "visible" || (blocco && !blocco.released)) return;
      try {
        blocco = await navigator.wakeLock.request("screen");
      } catch {
        // Negato (es. batteria scarica): pazienza, l'app funziona lo stesso.
      }
    }

    richiedi();
    document.addEventListener("visibilitychange", richiedi);
    return () => {
      attivo = false;
      document.removeEventListener("visibilitychange", richiedi);
      blocco?.release().catch(() => {});
    };
  }, []);
}

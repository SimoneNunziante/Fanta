import { useEffect } from "react";

function applica(scuro: boolean) {
  document.documentElement.classList.toggle("dark", scuro);
}

/** Rileva il tema chiaro/scuro del sistema e applica la classe "dark" su <html>. */
export function useTema() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    applica(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => applica(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);
}

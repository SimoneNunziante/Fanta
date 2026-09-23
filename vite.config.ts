import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serve l'app sotto /<nome-repo>/
export default defineConfig({
  base: "/Fanta/",
  plugins: [react()],
});

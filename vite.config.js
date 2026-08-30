import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// UWAGA: zmień "ksiazka-korespondencji" na dokładną nazwę swojego
// repozytorium na GitHubie, jeśli nazwiesz je inaczej.
// Jeśli repo będzie nazywać się np. "ksiazka-korespondencji",
// strona wyląduje pod: https://<twoj-login>.github.io/ksiazka-korespondencji/
export default defineConfig({
  plugins: [react()],
  base: "/KsiazkaKorespondencji/",
});

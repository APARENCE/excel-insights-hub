import { defineConfig } from "vite";
import react from "@tanstack/vite-plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  base: "",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/main.tsx"),
      },
    },
  },
});
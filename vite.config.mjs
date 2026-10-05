import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { scopeIcons } from './scripts/scope-icons.mjs';

export default defineConfig({
  css:{postcss:{plugins:[scopeIcons()]}},
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});

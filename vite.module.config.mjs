import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {scopeIcons}from './scripts/scope-icons.mjs';
export default defineConfig({
  // Library mode preserves process.env by default. Foundry runs this in a
  // browser, so React must be compiled without a Node.js process global.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins:[react()],css:{postcss:{plugins:[scopeIcons()]}}, publicDir:false,
  build:{ outDir:'build/editor', emptyOutDir:true, lib:{ entry:'src/module-entry.jsx', formats:['es'], fileName:()=> 'editor.js', cssFileName:'editor' } }
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {scopeIcons}from './scripts/scope-icons.mjs';
export default defineConfig({ plugins:[react()],css:{postcss:{plugins:[scopeIcons()]}}, publicDir:false, build:{ outDir:'build/editor', emptyOutDir:true, lib:{ entry:'src/module-entry.jsx', formats:['es'], fileName:()=> 'editor.js', cssFileName:'editor' } } });

# Prototype Instructions

## Durable project decisions

- User selected visual option 1: charcoal interface, lavender accent, large editor left, settings and two previews right.
- Token Studio is an independent Foundry 13 editor; never introduce a Tokenizer dependency.
- Preserve original image proportions and separate portrait/token transforms. User owns border images; retain custom PNG/WebP import.
- v0.1.0 exports static PNG/WebP. Real Foundry 13 + Lancer validation remains pending; do not declare verified compatibility without testing.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

# Prototype Instructions

## Durable project decisions

- User selected visual option 1: charcoal interface, lavender accent, large editor left, settings and two previews right.
- Token Studio is an independent Foundry 13 editor; never introduce a Tokenizer dependency.
- Importing a COMP/CON sheet must link the pilot to the Foundry actor, including its portrait, share code and sync date. Choosing new artwork prepares portrait and token together by default, with separate crops and no portrait border. The advanced option can replace only the active artwork; COMP/CON sync preserves customized tokens.
- Mouse wheel zooms the active image without scrolling the window; favorite frames appear first and as initial shortcuts. Sheet navigation follows COMP/CON narrative/tactical/hangar contexts, with separate pilot/mech actions and selected loadouts.
- Rules are grouped by their real source (weapon/system/talent/frame), with separate actions/passives/effects, filters and visible diagnostics; preserve unclassified fields. COMP/CON portraits and pasted public images use validated HTTPS URLs without automatic local copies. Reuse identical stored images by content hash, and mount long rules only when opened.
- Sheet choices must keep a readable fixed minimum height and scroll independently in short Foundry windows. Validate full native actors/loadout references before import, and prepare the native sheet after application with rollback on failure. COMP/CON V3 license stubs/custom trigger text must remain visible. Existing remote actor images without access flags must display when CORS blocks editing.
- Preserve original image proportions and separate portrait/token transforms. User owns border images; retain custom PNG/WebP import.
- v0.1.0 exports static PNG/WebP. Real Foundry 13 + Lancer validation remains pending; do not declare verified compatibility without testing.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

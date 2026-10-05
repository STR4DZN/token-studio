// Shared by the canvas and catalog so keyboard/range/wheel use the same limits.
export function wheelZoom(zoom, delta, mode = 0, fit = 'free') {
  if (!Number.isFinite(delta) || !delta) return zoom;
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? 400 : 1);
  return Math.min(4, Math.max(fit === 'cover' ? 1 : .1, zoom * Math.exp(-Math.max(-240, Math.min(240, pixels)) * .0015)));
}
export function readFavorites(storage) {
  try {
    const saved = JSON.parse((storage || globalThis.localStorage).getItem('token-studio-frame-favorites') || '[]');
    return Array.isArray(saved) ? [...new Set(saved.filter(id => typeof id === 'string'))] : [];
  } catch { return []; }
}
export function frameChoices(catalog, favorites, {query = '', author = '', onlyFavorites = false} = {}) {
  const ids = new Set(favorites);
  return catalog.filter(f => f.kind === 'frame' && (!author || f.author === author) && (!onlyFavorites || ids.has(f.id)) && `${f.name} ${f.author} ${f.original}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => Number(ids.has(b.id)) - Number(ids.has(a.id)));
}

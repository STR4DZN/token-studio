export function isDefaultImage(source) {
  if (!source?.trim()) return true;
  return /(?:^|\/)(?:icons\/svg\/mystery-man\.svg|systems\/lancer\/assets\/icons\/(?:white\/)?(?:pilot|mech|npc|deployable)\.svg|(?:modules\/token-studio\/)?assets\/pilot\.png)(?:[?#].*)?$/i.test(source);
}

export function syncPortraitProject(project, source) {
  const next = structuredClone(project);
  if (!next?.views?.portrait || !next?.views?.token) return next;
  next.views.portrait = {...next.views.portrait, src:source, animated:/\.gif(?:[?#]|$)/i.test(source)};
  // A token that has its own artwork keeps every adjustment and its source.
  if (isDefaultImage(next.views.token.src)) {
    next.views.token.src = source;
    next.views.token.animated = next.views.portrait.animated;
  }
  next.updatedAt = Date.now();
  return next;
}

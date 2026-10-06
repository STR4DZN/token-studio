// The only fields this editor is allowed to modify are image destinations and its own flags.
export const usesNativeRing=(token,project)=>project.views.token.frame==='none'&&(project.views.token.ringMode==='native'||(project.views.token.ringMode==null&&token?.ring?.enabled));
const tokenPath=(token,project,paths)=>usesNativeRing(token,project)&&paths.nativeToken?paths.nativeToken:paths.token;
export function buildActorPatch(project, destinations, paths, actor = null) {
  const patch = { 'flags.token-studio.project': project };
  if (destinations.portrait) patch.img = paths.portrait;
  if (destinations.prototype) {
    const path=tokenPath(actor?.prototypeToken,project,paths);
    patch['prototypeToken.texture.src'] = path;
    patch['prototypeToken.ring.enabled'] = usesNativeRing(actor?.prototypeToken,project);
    if(usesNativeRing(actor?.prototypeToken,project)) {
      patch['prototypeToken.ring.subject.texture']=path;
      if(paths.nativeToken)patch['prototypeToken.ring.subject.scale']=1;
    }
  }
  return patch;
}
export function buildScenePatch(tokens, project, paths) {
  return tokens.map(token => {const path=tokenPath(token,project,paths);return { _id: token.id, 'texture.src': path, 'ring.enabled':usesNativeRing(token,project), ...(usesNativeRing(token,project)?{'ring.subject.texture':path,...(paths.nativeToken?{'ring.subject.scale':1}:{})}:{}) };});
}
export async function applyTransaction({ actor, scene, tokens, project, destinations, paths }) {
  const before = { img: actor.img, 'prototypeToken.texture.src': actor.prototypeToken.texture.src, 'prototypeToken.ring.enabled': actor.prototypeToken.ring?.enabled ?? false, 'prototypeToken.ring.subject.texture': actor.prototypeToken.ring?.subject?.texture || '', 'prototypeToken.ring.subject.scale':actor.prototypeToken.ring?.subject?.scale??1, 'flags.token-studio.project': actor.getFlag('token-studio', 'project') ?? null };
  const previousTokens = tokens.map(t => ({ _id: t.id, 'texture.src': t.texture.src, 'ring.enabled': t.ring?.enabled ?? false, 'ring.subject.texture':t.ring?.subject?.texture || '', 'ring.subject.scale':t.ring?.subject?.scale??1 }));
  await actor.update(buildActorPatch(project, destinations, paths, actor));
  if (!destinations.scene) return;
  try { await scene.updateEmbeddedDocuments('Token', buildScenePatch(tokens, project, paths)); }
  catch (error) {
    const rollback = await Promise.allSettled([actor.update(before), scene.updateEmbeddedDocuments('Token', previousTokens)]);
    if (rollback.some(r => r.status === 'rejected')) throw new Error('Falha ao aplicar à cena e ao restaurar parte das alterações. Confira a ficha e os tokens selecionados; seu rascunho está preservado.');
    throw new Error('A atualização da cena falhou. As imagens anteriores foram restauradas; seu rascunho está preservado.');
  }
}

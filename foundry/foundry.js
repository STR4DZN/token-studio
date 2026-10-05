import { mountEditor } from './editor.js';
import { assetPath } from './asset-path.js';
import { isDefaultImage } from './actor-images.js';
import { validateImageURL } from './image-url.js';
import { imageFilename, storedImage } from './image-storage.js';
import { applyTransaction } from './transaction.js';
import {prepareSheetPlan,applySheetPlan,readNativePilot}from'./sheet-adapter.js';
import {validateNativeActor,validateNativeDocument,verifyNativeSheet} from './native-validation.js';
import {readData} from './stored-data.js';
const ID = 'token-studio';
let EditorClass;
const windows = new Map();
const route = path => foundry.utils.getRoute(path);
const imageRoute = source => /^(?:https?:|data:)/i.test(source) ? source : route(source);
const actorSource = actor => isDefaultImage(actor.img) ? route(`modules/${ID}/assets/pilot.png`) : imageRoute(actor.img);
const picker = () => foundry.applications.apps.FilePicker.implementation;
const actorOf = app => app.actor || (app.document?.documentName === 'Actor' ? app.document : app.object?.documentName === 'Actor' ? app.object : null);
function fail(error) { console.error('Token Studio', error); ui.notifications.error(error.message || 'Token Studio: não foi possível abrir.'); }
function safeSegment(value) { return String(value || 'image').normalize('NFKD').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 70); }
async function ensureFolder(path) {
  const FilePicker = picker(); let current = '';
  for (const segment of path.split('/').filter(Boolean)) {
    current = current ? `${current}/${segment}` : segment;
    try { await FilePicker.browse('data', current); }
    catch { await FilePicker.createDirectory('data', current); }
  }
}
const imageUploads = new Map();
async function upload(actor, file, kind) {
  const base = game.settings.get(ID, 'outputFolder').replace(/^\/+|\/+$/g, '');
  if (!base || base.split('/').some(x => x === '..' || x === '.') || /^https?:|^modules\//i.test(base)) throw new Error('Defina uma pasta de saída dentro de Data, fora da pasta de módulos.');
  if(file.type.startsWith('image/')) {
    const folder=`${base}/images`, filename=await imageFilename(file), key=folder+'/'+filename;
    if(imageUploads.has(key))return imageUploads.get(key);
    const task=(async()=>{
      await ensureFolder(folder);
      const existing=storedImage((await picker().browse('data',folder)).files,filename);
      if(existing)return existing;
      const result=await picker().upload('data',folder,new File([file],filename,{type:file.type}),{},{notify:false});
      if(!result?.path)throw new Error('O envio da imagem falhou. Confira a pasta de saída.');
      return result.path;
    })();
    imageUploads.set(key,task);
    try{return await task;}finally{imageUploads.delete(key);}
  }
  const folder = `${base}/${safeSegment(actor.id)}/${kind}`;
  await ensureFolder(folder);
  const ext = file.type === 'application/json' ? 'json' : file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : file.type === 'image/gif' ? 'gif' : 'png';
  const named = new File([file], `${safeSegment(actor.name)}-${Date.now()}-${foundry.utils.randomID(6)}.${ext}`, { type:file.type });
  const result = await picker().upload('data', folder, named, {}, { notify:false });
  if (!result?.path) throw new Error('O envio do arquivo falhou. Confira as permissões e a pasta de saída.');
  return result.path;
}
async function persistEmbeddedSources(actor, project) {
  const saved = structuredClone(project), replacements = new Map();
  for (const view of Object.values(saved.views)) for (const key of ['src', 'frameSrc']) {
    const src = view[key]; if (!src?.startsWith('data:')) continue;
    if (!replacements.has(src)) { const response = await fetch(src); const file = await response.blob(); replacements.set(src, await upload(actor, file, key === 'frameSrc' ? 'frames' : 'originals')); }
    view[key] = replacements.get(src);
  }
  return saved;
}
async function storePortrait(actor, source) {
  if(source.startsWith('data:'))throw new Error('Este retrato está incorporado no JSON. Defina uma URL pública em Retrato por URL antes de aplicar.');
  const result=await validateImageURL(source,{allowDisplayOnly:true});
  return {url:result.url,editable:result.editable};
}
function selectedTokens(actor) { return (canvas.tokens?.controlled || []).filter(t => t.document.actorId === (actor.parent ? actor.parent.actorId : actor.id)).map(t => t.document); }
async function open(actor, token = null, mode = 'images') {
  if (!game.user.isGM) throw new Error('O Token Studio está disponível para o mestre.');
  if (!actor || actor.documentName !== 'Actor') throw new Error('Escolha um personagem para abrir o editor.');
  if (!actor.canUserModify(game.user, 'update')) throw new Error('Você não pode editar este personagem.');
  const key = actor.uuid;
  if (windows.has(key)) { const app = windows.get(key); if (app.minimized) await app.maximize(); app._unmount?.setMode?.(mode); app.bringToFront(); return app; }
  const app = new EditorClass(actor, token, mode); windows.set(key, app);
  try { await app.render(true); } catch (e) { windows.delete(key); throw e; }
  return app;
}
Hooks.once('init', () => {
  game.settings.register(ID, 'outputFolder', { name:'Token Studio: pasta de imagens', hint:'Caminho dentro de Data. O módulo preserva originais e cria arquivos novos a cada aplicação.', scope:'world', config:true, type:String, default:'token-studio' });
  game.settings.register(ID, 'presets', { scope:'world', config:false, type:Object, default:[] });
  const { ApplicationV2 } = foundry.applications.api;
  EditorClass = class TokenStudioApplication extends ApplicationV2 {
    static DEFAULT_OPTIONS = { id:'token-studio-editor-{id}', classes:['token-studio-window'], tag:'section', window:{ title:'Token Studio', icon:'fa-solid fa-crop-simple', resizable:true }, position:{ width:1280, height:900 } };
    constructor(actor, token, mode) { super({ id:`token-studio-${actor.id}-${foundry.utils.randomID(5)}`, position:{ width:Math.min(1360, window.innerWidth - 40), height:Math.min(960, window.innerHeight - 40) } }); this.actor = actor; this.token = token; this.initialMode=mode; }
    async _renderHTML() { const element = document.createElement('div'); element.className = 'ts-mount'; return element; }
    _replaceHTML(result, content) {
      // Keep the React root alive across resize and Foundry re-render events.
      if (this._unmount) return;
      content.replaceChildren(result);
      const actor = this.actor;
      const project = actor.getFlag(ID, 'project');
      const source = actorSource(actor);
      const tokenSource=isDefaultImage(actor.prototypeToken.texture.src)?null:imageRoute(actor.prototypeToken.texture.src);
      this._unmount = mountEditor(result, {
        isFoundry:true,portraitEditable:actor.getFlag(ID,'portraitSource')?.editable, initialMode:this.initialMode,actorUuid:actor.uuid,sheetProject:readData(actor.getFlag(ID,'sheetProject')),shareLink:actor.system?.cloud_id?.length===12?`https://compcon.app/link/pilot/${actor.system.cloud_id}/full/`:undefined,
        readActorSheet:()=>readNativePilot(actor,game),openItem:async uuid=>(await fromUuid(uuid))?.sheet?.render(true),
        prepareSheetApply:(sheet,parts)=>prepareSheetPlan({actor,sheet,parts,game,validateActor:validateNativeActor,validateItem:async(data,parent)=>{const candidate=new CONFIG.Item.documentClass(data,{parent});validateNativeDocument(candidate);}}),
        applySheet:async(plan,sheet)=>{const result=await applySheetPlan({plan,sheet,game,verifyActor:verifyNativeSheet,resolvePortrait:storePortrait,createActor:data=>CONFIG.Actor.documentClass.create(data),saveBackup:async snapshots=>{plan.backupPath=await upload(actor,new Blob([JSON.stringify({schema:'token-studio-foundry-backup-1',createdAt:Date.now(),world:game.world.id,documents:snapshots},null,2)],{type:'application/json'}),'backups');}});ui.notifications.info(`Token Studio: ficha aplicada. Backup: ${plan.backupPath}`);return {...result,name:actor.name,source:actorSource(actor),tokenSource:isDefaultImage(actor.prototypeToken.texture.src)?null:imageRoute(actor.prototypeToken.texture.src),shareLink:actor.system.cloud_id?`https://compcon.app/link/pilot/${actor.system.cloud_id}/full/`:'',sheetProject:readData(actor.getFlag(ID,'sheetProject')),imageUpdate:result.portrait?{id:foundry.utils.randomID(),source:imageRoute(result.portrait),editable:result.portraitEditable}:null};},
        assetsBase:assetPath(route(`modules/${ID}/assets`)), name:actor.name, type:({pilot:'Piloto',mech:'Mech',npc:'NPC',deployable:'Deployable'})[actor.type] || actor.type,
        key:`${game.world.id}:${actor.uuid}:${game.user.id}`, source, project, tokenSource:tokenSource && !tokenSource.includes('mystery-man') && tokenSource!==actor.img ? tokenSource:null, sceneCount:selectedTokens(actor).length,getSceneCount:()=>selectedTokens(actor).length,
        presets:game.settings.get(ID, 'presets'), savePresets:items => game.settings.set(ID, 'presets', items),
        importFile:(file,kind) => upload(actor,file,kind), onClose:() => this.close(),
        pickImage:() => new Promise(resolve => { const FilePicker = picker(); let settled = false; const finish = value => { if (settled) return; settled = true; resolve(value); }; const app = new FilePicker({ type:'image', current:actor.img, callback:path => finish(path) }); app.addEventListener('close', () => finish(null), { once:true }); app.render(true); }),
        apply:async ({ project, destinations, format, exportView }) => {
          if (!game.user.isGM || !actor.canUserModify(game.user, 'update')) throw new Error('Sem permissão para atualizar o personagem.');
          const tokens = destinations.scene ? selectedTokens(actor) : [];
          if (destinations.scene && (!tokens.length || !canvas.scene)) throw new Error('Selecione ao menos um token deste personagem na cena atual.');
          if (tokens.some(t => !t.canUserModify(game.user, 'update'))) throw new Error('Sem permissão para atualizar um dos tokens selecionados.');
          if (destinations.prototype && actor.prototypeToken.randomImg) throw new Error('Este personagem usa imagens aleatórias. A aplicação no token padrão foi interrompida para preservar o wildcard. Exporte uma variante ou escolha apenas os tokens da cena.');
          const saved = await persistEmbeddedSources(actor, project), paths = {};
          // Render every output before changing any document.
          const outputs = {};
          if (destinations.portrait && !destinations.originalAnimation) outputs.portrait = await exportView('portrait');
          if (destinations.prototype || destinations.scene) outputs.token = await exportView('token');
          for (const [key, blob] of Object.entries(outputs)) paths[key] = await upload(actor, blob, key === 'portrait' ? 'portraits' : 'tokens');
          if (destinations.portrait && destinations.originalAnimation) paths.portrait = saved.views.portrait.src;
          saved.updatedAt = Date.now();
          await applyTransaction({ actor, scene:canvas.scene, tokens, project:saved, destinations, paths });
          ui.notifications.info('Token Studio: imagens aplicadas.');
        }
      });
    }
    async _onClose(options) { this._unmount?.(); this._unmount = null; windows.delete(this.actor.uuid); await super._onClose(options); }
  };
  const api = { open,openSheet:actor=>open(actor,null,'sheet'), version:game.modules.get(ID).version }; game.modules.get(ID).api = api;
});
Hooks.on('getActorSheetHeaderButtons', (app, buttons) => { const actor = actorOf(app); if (!game.user.isGM || !actor || buttons.some(b => b.class === ID)) return; buttons.unshift({ label:'Token Studio', class:ID, icon:'fa-solid fa-crop-simple', onclick:() => open(actor, app.token).catch(fail) }); });
Hooks.on('getHeaderControlsApplicationV2', (app, controls) => { const actor = actorOf(app); if (!game.user.isGM || !actor || controls.some(b => b.action === ID)) return; controls.unshift({ label:'Token Studio', action:ID, icon:'fa-solid fa-crop-simple', onClick:() => open(actor, app.token).catch(fail) }); });
// Foundry 13 replaced getActorDirectoryEntryContext with getActorContextOptions.
Hooks.on('getActorContextOptions', (app, entries) => {
  if (entries.some(entry => entry.name === 'Token Studio')) return;
  function actorFromEntry(li) {
    const element = li?.dataset ? li : li?.[0];
    const id = element?.dataset?.entryId || element?.dataset?.documentId || element?.dataset?.actorId;
    if (!id) return null;
    return app.collection?.get(id) || game.actors.get(id);
  }
  entries.push({
    name:'Token Studio', icon:'<i class="fa-solid fa-crop-simple"></i>',
    condition:li => game.user.isGM && Boolean(actorFromEntry(li)?.canUserModify(game.user, 'update')),
    callback:li => open(actorFromEntry(li)).catch(fail)
  });
});

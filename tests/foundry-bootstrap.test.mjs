import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile}from 'node:fs/promises';
const manifest=JSON.parse(await readFile(new URL('../foundry/module.json',import.meta.url),'utf8'));
const mounted=[];
const hooks=new Map(),settings=[],module={version:manifest.version};
globalThis.Hooks={once:(n,f)=>hooks.set(n,f),on:(n,f)=>hooks.set(n,f)};
globalThis.window={innerWidth:1400,innerHeight:1000};
globalThis.game={user:{isGM:true,id:'gm'},world:{id:'test-world'},modules:new Map([['token-studio',module]]),settings:{get:()=>[],register:(id,key,options)=>settings.push({id,key,options})}};
let rendered=0;
class ApplicationV2{constructor(options){this.options=options;}async render(){rendered++;return this;}bringToFront(){this.front=true;}async maximize(){}async _onClose(){}}
globalThis.foundry={applications:{api:{ApplicationV2}},utils:{getRoute:p=>'/vtt/'+p.replace(/^\/+|\/+$/g,''),randomID:()=> 'abc123'}};
const code=(await readFile(new URL('../foundry/foundry.js',import.meta.url),'utf8')).replace("import { mountEditor } from './editor.js';",'const mountEditor=(element,host)=>{globalThis.__tokenStudioTestMounts.push(host);return()=>{};};').replace("'./asset-path.js'",JSON.stringify(new URL('../src/asset-path.js',import.meta.url).href)).replace("'./sheet-adapter.js'",JSON.stringify(new URL('../foundry/sheet-adapter.js',import.meta.url).href)).replace("'./transaction.js'",JSON.stringify(new URL('../foundry/transaction.js',import.meta.url).href));
globalThis.__tokenStudioTestMounts=mounted;
await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
hooks.get('init')();
const actor={id:'a1',uuid:'Actor.a1',documentName:'Actor',canUserModify:()=>true};
test('inicialização expõe API da versão instalada e configura armazenamento do mundo',()=>{assert.equal(module.api.version,manifest.version);assert.equal(settings.find(s=>s.key==='outputFolder').options.default,'token-studio');assert.equal(settings.find(s=>s.key==='presets').options.scope,'world');});
test('API nega acesso de jogador e ator sem permissão',async()=>{game.user.isGM=false;await assert.rejects(module.api.open(actor),/mestre/);game.user.isGM=true;await assert.rejects(module.api.open({...actor,canUserModify:()=>false}),/editar/);});
test('abrir o mesmo ator reutiliza a janela, sem duplicar editores',async()=>{const a=await module.api.open(actor),b=await module.api.open(actor);assert.equal(a,b);assert.equal(rendered,1);assert.equal(a.front,true);});
test('integração de cabeçalho não duplica botão e permanece exclusiva do mestre',()=>{const buttons=[];hooks.get('getActorSheetHeaderButtons')({actor},buttons);hooks.get('getActorSheetHeaderButtons')({actor},buttons);assert.equal(buttons.length,1);game.user.isGM=false;const hidden=[];hooks.get('getActorSheetHeaderButtons')({actor},hidden);assert.equal(hidden.length,0);game.user.isGM=true;const controls=[];hooks.get('getHeaderControlsApplicationV2')({actor},controls);assert.equal(controls[0].action,'token-studio');});
test('menu usa o evento público do Foundry 13 e abre o ator clicado',async()=>{
  assert.equal(hooks.has('getActorDirectoryEntryContext'),false);
  const handler=hooks.get('getActorContextOptions');assert.equal(typeof handler,'function');
  const clicked={...actor,id:'context-actor',uuid:'Actor.context-actor'};
  game.actors=new Map([[actor.id,actor],[clicked.id,clicked]]);
  const app={collection:game.actors},entries=[],li={dataset:{entryId:clicked.id}};
  handler(app,entries);handler(app,entries);assert.equal(entries.length,1);
  assert.equal(entries[0].name,'Token Studio');assert.equal(entries[0].condition(li),true);
  const window=await entries[0].callback(li);assert.equal(window.actor,clicked);
  assert.equal(entries[0].condition({dataset:{entryId:'missing'}}),false);
  game.user.isGM=false;assert.equal(entries[0].condition(li),false);game.user.isGM=true;
  clicked.canUserModify=()=>false;assert.equal(entries[0].condition(li),false);clicked.canUserModify=()=>true;
});
test('menu aceita identificador documentId e usa a coleção do aplicativo',async()=>{
  const clicked={...actor,id:'collection-actor',uuid:'Actor.collection-actor'};
  const entries=[];hooks.get('getActorContextOptions')({collection:new Map([[clicked.id,clicked]])},entries);
  const li={dataset:{documentId:clicked.id}};assert.equal(entries[0].condition(li),true);
  assert.equal((await entries[0].callback(li)).actor,clicked);
});
test('controles das fichas V1 e V2 abrem o editor, sem duplicatas',async()=>{
  const clicked={...actor,id:'sheet-actor',uuid:'Actor.sheet-actor'},buttons=[],controls=[];
  hooks.get('getActorSheetHeaderButtons')({actor:clicked},buttons);
  hooks.get('getHeaderControlsApplicationV2')({document:clicked},controls);
  hooks.get('getHeaderControlsApplicationV2')({document:clicked},controls);
  assert.equal(controls.length,1);assert.equal((await buttons[0].onclick()).actor,clicked);
  assert.equal((await controls[0].onClick()).actor,clicked);
});

test('rotas de imagens preservam o prefixo e a barra antes dos arquivos do catálogo',async()=>{
  globalThis.canvas={tokens:{controlled:[]}};
  const clicked={...actor,id:'asset-actor',uuid:'Actor.asset-actor',getFlag:()=>null,prototypeToken:{texture:{src:''}}};
  const app=await module.api.open(clicked);
  app._replaceHTML({}, {replaceChildren(){}});
  const host=mounted.at(-1);
  assert.equal(host.assetsBase,'/vtt/modules/token-studio/assets/');
  const catalog=JSON.parse(await readFile(new URL('../src/frame-catalog.json',import.meta.url),'utf8'));
  for(const entry of catalog)for(const key of ['file','thumb']){
    assert.equal(host.assetsBase+entry[key],'/vtt/modules/token-studio/assets/'+entry[key]);
  }
});

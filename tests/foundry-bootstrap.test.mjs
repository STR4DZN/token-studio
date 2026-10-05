import test from 'node:test';
import assert from 'node:assert/strict';
import {createSheet,setPath} from '../src/compcon.js';
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
const code=(await readFile(new URL('../foundry/foundry.js',import.meta.url),'utf8')).replace("import { mountEditor } from './editor.js';",'const mountEditor=(element,host)=>{globalThis.__tokenStudioTestMounts.push(host);return()=>{};};').replace("'./image-url.js'",JSON.stringify(new URL('../src/image-url.js',import.meta.url).href)).replace("'./image-storage.js'",JSON.stringify(new URL('../src/image-storage.js',import.meta.url).href)).replace("'./actor-images.js'",JSON.stringify(new URL('../src/actor-images.js',import.meta.url).href)).replace("'./compcon.js'",JSON.stringify(new URL('../src/compcon.js',import.meta.url).href)).replace("'./asset-path.js'",JSON.stringify(new URL('../src/asset-path.js',import.meta.url).href)).replace("'./sheet-adapter.js'",JSON.stringify(new URL('../foundry/sheet-adapter.js',import.meta.url).href)).replace("'./transaction.js'",JSON.stringify(new URL('../foundry/transaction.js',import.meta.url).href));
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

test('adaptador mantém URL do retrato sem upload e devolve estado atualizado ao editor aberto',async()=>{
 const saved={fetch:globalThis.fetch,Image:globalThis.Image,ui:globalThis.ui,settings:game.settings.get,system:game.system,actors:game.actors,apps:foundry.applications.apps};
 const uploads=[],clicked={...actor,id:'linked-pilot',uuid:'Actor.linked-pilot',name:'Antigo',type:'pilot',img:'old.png',system:{},flags:{},prototypeToken:{texture:{src:'custom-token.png',scaleX:1.6}},items:{contents:[]},getFlag(ns,key){return this.flags[ns]?.[key];},toObject(){return structuredClone({_id:this.id,name:this.name,type:this.type,img:this.img,system:this.system,flags:this.flags,prototypeToken:this.prototypeToken,items:[]});},async update(patch){for(const[k,v]of Object.entries(patch))if(k.includes('.'))setPath(this,k.split('.'),v);else this[k]=structuredClone(v);}};
 try{
  game.settings.get=(_,key)=>key==='outputFolder'?'token-studio':[];game.system={id:'lancer'};game.actors={contents:[clicked]};globalThis.ui={notifications:{info(){}}};
  foundry.applications.apps={FilePicker:{implementation:{browse:async()=>({}),upload:async(_,folder,file)=>{uploads.push({folder,file});return{path:folder+'/'+file.name};}}}};
  globalThis.Image=class{naturalWidth=100;naturalHeight=100;set src(value){this.onload();}};
  globalThis.fetch=async(url,options)=>{assert.equal(url,'https://img.test/pilot.png');assert.equal(options.credentials,'omit');return new Response(new Uint8Array([137,80,78,71,13,10,26,10]));};
  const app=await module.api.open(clicked);app._replaceHTML({}, {replaceChildren(){}});const host=mounted.at(-1),sheet=createSheet({itemType:'pilot',id:'pilot',name:'Novo',callsign:'N',mechs:[],img:{cloud_portrait:'https://img.test/pilot.png'}},{code:'123456789012'});
  const plan=await host.prepareSheetApply(sheet,{identity:true,portrait:true,build:false,combat:false,mechs:false});const result=await host.applySheet(plan,sheet);
  assert.equal(uploads.length,1);assert.equal(uploads[0].file.type,'application/json');
  const backup=JSON.parse(await uploads[0].file.text());assert.equal(backup.documents[0].img,'old.png');assert.equal(clicked.img,'https://img.test/pilot.png');assert.equal(clicked.flags['token-studio'].portraitSource.mode,'url');
  assert.equal(result.name,'Novo');assert.equal(result.source,clicked.img);assert.equal(result.imageUpdate.source,result.source);assert.equal(result.tokenSource,'/vtt/custom-token.png');assert.equal(result.sheetProject.source.actorUuid,clicked.uuid);assert.equal(result.shareLink,'https://compcon.app/link/pilot/123456789012/full/');assert.equal(clicked.prototypeToken.texture.scaleX,1.6);
 }finally{globalThis.fetch=saved.fetch;globalThis.Image=saved.Image;globalThis.ui=saved.ui;game.settings.get=saved.settings;game.system=saved.system;game.actors=saved.actors;foundry.applications.apps=saved.apps;}
});

test('imagens idênticas são reutilizadas por conteúdo entre atores e aplicações',async()=>{
 const saved={apps:foundry.applications.apps,settings:game.settings.get,ui:globalThis.ui,canvas:globalThis.canvas};
 const uploads=[],files=[];
 try{
  game.settings.get=(_,key)=>key==='outputFolder'?'token-studio':[];globalThis.ui={notifications:{info(){}}};globalThis.canvas={tokens:{controlled:[]}};
  foundry.applications.apps={FilePicker:{implementation:{browse:async()=>({files:[...files]}),upload:async(_,folder,file)=>{const path=folder+'/'+file.name;uploads.push(path);files.push(path);return{path};}}}};
  const {createProject}=await import('../src/engine.js');
  const make=(id)=>({...actor,id,uuid:'Actor.'+id,name:id,img:'old.png',flags:{},prototypeToken:{texture:{src:'token.png'}},getFlag(ns,key){return this.flags[ns]?.[key];},async update(patch){for(const[k,v]of Object.entries(patch))if(k.includes('.'))setPath(this,k.split('.'),v);else this[k]=structuredClone(v);}});
  for(const id of ['dedup-a','dedup-b']){
   const pilot=make(id),app=await module.api.open(pilot);app._replaceHTML({}, {replaceChildren(){}});const host=mounted.at(-1);
   const options={project:createProject('https://img.test/original.png'),destinations:{portrait:true,prototype:false,scene:false},exportView:async()=>new Blob(['same-image'],{type:'image/png'})};
   await host.apply(options);const first=pilot.img;await host.apply(options);assert.equal(pilot.img,first);assert.match(first,/token-studio\/images\/[a-f0-9]{64}\.png$/);
  }
  assert.equal(uploads.length,1);
 }finally{foundry.applications.apps=saved.apps;game.settings.get=saved.settings;globalThis.ui=saved.ui;globalThis.canvas=saved.canvas;}
});

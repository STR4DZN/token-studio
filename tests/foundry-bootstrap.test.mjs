import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile}from 'node:fs/promises';
const hooks=new Map(),settings=[],module={};
globalThis.Hooks={once:(n,f)=>hooks.set(n,f),on:(n,f)=>hooks.set(n,f)};
globalThis.window={innerWidth:1400,innerHeight:1000};
globalThis.game={user:{isGM:true,id:'gm'},world:{id:'test-world'},modules:new Map([['token-studio',module]]),settings:{register:(id,key,options)=>settings.push({id,key,options})}};
let rendered=0;
class ApplicationV2{constructor(options){this.options=options;}async render(){rendered++;return this;}bringToFront(){this.front=true;}async maximize(){}async _onClose(){}}
globalThis.foundry={applications:{api:{ApplicationV2}},utils:{getRoute:p=>p,randomID:()=> 'abc123'}};
const code=(await readFile(new URL('../foundry/foundry.js',import.meta.url),'utf8')).replace("import { mountEditor } from './editor.js';",'const mountEditor=()=>()=>{};').replace("'./sheet-adapter.js'",JSON.stringify(new URL('../foundry/sheet-adapter.js',import.meta.url).href)).replace("'./transaction.js'",JSON.stringify(new URL('../foundry/transaction.js',import.meta.url).href));
await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
hooks.get('init')();
const actor={id:'a1',uuid:'Actor.a1',documentName:'Actor',canUserModify:()=>true};
test('inicialização expõe API própria e configura armazenamento do mundo',()=>{assert.equal(module.api.version,'0.2.0');assert.equal(settings.find(s=>s.key==='outputFolder').options.default,'token-studio');assert.equal(settings.find(s=>s.key==='presets').options.scope,'world');});
test('API nega acesso de jogador e ator sem permissão',async()=>{game.user.isGM=false;await assert.rejects(module.api.open(actor),/mestre/);game.user.isGM=true;await assert.rejects(module.api.open({...actor,canUserModify:()=>false}),/editar/);});
test('abrir o mesmo ator reutiliza a janela, sem duplicar editores',async()=>{const a=await module.api.open(actor),b=await module.api.open(actor);assert.equal(a,b);assert.equal(rendered,1);assert.equal(a.front,true);});
test('integração de cabeçalho não duplica botão e permanece exclusiva do mestre',()=>{const buttons=[];hooks.get('getActorSheetHeaderButtons')({actor},buttons);hooks.get('getActorSheetHeaderButtons')({actor},buttons);assert.equal(buttons.length,1);game.user.isGM=false;const hidden=[];hooks.get('getActorSheetHeaderButtons')({actor},hidden);assert.equal(hidden.length,0);game.user.isGM=true;const controls=[];hooks.get('getHeaderControlsApplicationV2')({actor},controls);assert.equal(controls[0].action,'token-studio');});

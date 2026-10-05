import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(process.env.MODULE_TEST_DIR || fileURLToPath(new URL('../release/token-studio/',import.meta.url)));

async function fixture() {
  const manifest=JSON.parse(await readFile(path.join(root,'module.json'),'utf8'));
  const hooks=new Map(),settings=[],installed={version:manifest.version,active:true};
  const actors=new Map();
  class ApplicationV2 {
    constructor(options){this.options=options;}
    async render(){this.rendered=true;return this;}
    bringToFront(){this.front=true;}
    async maximize(){}
    async _onClose(){}
  }
  // No process, require, Buffer or other Node globals. Unlike the source
  // bootstrap tests, every packaged dependency (including React) is loaded.
  const context=vm.createContext({
    console,setTimeout,clearTimeout,performance,URL,AbortSignal,structuredClone,
    window:{innerWidth:1400,innerHeight:1000},
    Hooks:{once:(name,fn)=>hooks.set(name,fn),on:(name,fn)=>hooks.set(name,fn)},
    game:{user:{isGM:true,id:'gm'},world:{id:'test'},actors,modules:new Map([['token-studio',installed]]),settings:{register:(id,key,options)=>settings.push({id,key,options})}},
    foundry:{applications:{api:{ApplicationV2}},utils:{getRoute:p=>p,randomID:()=> 'test123'}},
    ui:{notifications:{error:message=>{throw new Error(message);}}}
  });
  const modules=new Map();
  async function load(file) {
    const name=path.resolve(file);
    assert(name.startsWith(root+path.sep),'Imports must stay within the installed module');
    if(modules.has(name))return modules.get(name);
    const source=await readFile(name,'utf8');
    const module=new vm.SourceTextModule(source,{context,identifier:name});
    modules.set(name,module);
    await module.link((specifier,parent)=>{
      assert(specifier.startsWith('./') || specifier.startsWith('../'),'The release must not import an external dependency');
      return load(path.resolve(path.dirname(parent.identifier),specifier));
    });
    return module;
  }
  return {manifest,context,hooks,settings,installed,actors,load};
}

test('editor compilado importa sem process e sem dependências externas',async()=>{
  const f=await fixture();assert.equal('process' in f.context,false);
  const editor=await f.load(path.join(root,'scripts/editor.js'));
  await editor.evaluate();assert.equal(typeof editor.namespace.mountEditor,'function');
});

test('entrada real do manifesto carrega todas as dependências e registra menu/API',async()=>{
  const f=await fixture();
  for(const entry of f.manifest.esmodules)await (await f.load(path.join(root,entry))).evaluate();
  assert.equal(typeof f.hooks.get('init'),'function');
  assert.equal(typeof f.hooks.get('getActorContextOptions'),'function');
  assert.equal(f.hooks.has('getActorDirectoryEntryContext'),false);
  f.hooks.get('init')();assert.equal(f.installed.api.version,f.manifest.version);
  assert.equal(typeof f.installed.api.open,'function');
  assert(f.settings.some(s=>s.key==='outputFolder'));
});

test('menu do módulo empacotado abre o ator clicado e oculta ações de jogador',async()=>{
  const f=await fixture();
  for(const entry of f.manifest.esmodules)await (await f.load(path.join(root,entry))).evaluate();
  f.hooks.get('init')();
  const actor={id:'clicked',uuid:'Actor.clicked',documentName:'Actor',canUserModify:()=>true};
  f.actors.set(actor.id,actor);
  const entries=[],app={collection:f.actors},li={dataset:{entryId:actor.id}};
  f.hooks.get('getActorContextOptions')(app,entries);
  f.hooks.get('getActorContextOptions')(app,entries);
  assert.equal(entries.length,1);assert.equal(entries[0].condition(li),true);
  const opened=await entries[0].callback(li);assert.equal(opened.actor,actor);assert.equal(opened.rendered,true);
  f.context.game.user.isGM=false;assert.equal(entries[0].condition(li),false);
  await assert.rejects(f.installed.api.open(actor),/mestre/);
});

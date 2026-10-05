import test from 'node:test';
import assert from 'node:assert/strict';
import {wheelZoom,readFavorites,frameChoices} from '../src/editor-controls.js';
import {unitActions,loadoutEntries,mountTitle,sheetUnitIndex} from '../src/sheet-navigation.js';
import {entries,allActions} from '../src/compcon.js';

test('roda amplia/reduz, normaliza pixels/linhas/páginas e respeita limites de recorte',()=>{
 assert.ok(wheelZoom(1,-120)>1);assert.ok(wheelZoom(1,120)<1);
 assert.equal(wheelZoom(1,16),wheelZoom(1,1,1));assert.equal(wheelZoom(1,240),wheelZoom(1,1,2));
 assert.equal(wheelZoom(.1,120),.1);assert.equal(wheelZoom(1,120,0,'cover'),1);assert.equal(wheelZoom(4,-120),4);assert.equal(wheelZoom(2,NaN),2);
});
test('favoritas têm prioridade estável sem perder busca, coleção ou catálogo original',()=>{
 const catalog=[{id:'a',kind:'frame',name:'A',author:'Um'},{id:'b',kind:'frame',name:'B',author:'Dois'},{id:'c',kind:'frame',name:'C',author:'Um'},{id:'d',kind:'support',name:'D',author:'Um'}],before=structuredClone(catalog);
 assert.deepEqual(frameChoices(catalog,['c']).map(f=>f.id),['c','a','b']);assert.deepEqual(frameChoices(catalog,['c'],{author:'Um'}).map(f=>f.id),['c','a']);assert.deepEqual(frameChoices(catalog,['c'],{query:'A'}).map(f=>f.id),['a']);assert.deepEqual(frameChoices(catalog,['c'],{onlyFavorites:true}).map(f=>f.id),['c']);assert.deepEqual(catalog,before);
});
test('favoritas salvas inválidas ou indisponíveis não derrubam o editor',()=>{
 for(const text of ['{}','null','bad'])assert.deepEqual(readFavorites({getItem:()=>text}),[]);
 assert.deepEqual(readFavorites({getItem:()=>JSON.stringify(['a','a',null,12,'b'])}),['a','b']);assert.deepEqual(readFavorites({getItem(){throw Error('denied');}}),[]);
});
const action=(name,activation='Quick')=>({name,activation,detail:'<p>Regra</p>'});
const weapon=(id,name)=>({id,data:{id,name,actions:[action(name)]}});
const raw=()=>({name:'Piloto',callsign:'P',talents:[{id:'t',rank:1,data:{name:'Talento',ranks:[{actions:[action('Rank I')]},{actions:[action('Rank II')]}]}}],loadouts:[{weapons:[weapon('p','Piloto')]}],mechs:[{id:'m1',loadouts:[{mounts:[{mount_type:'Main',slots:[{weapon:weapon('w1','Ativo')}]}]},{mounts:[{mount_type:'Flex',extra:[{weapon:weapon('w2','Inativo')}]}]}],active_loadout_index:0},{id:'m2',loadouts:[{integratedSystems:[{id:'s',data:{name:'Outro mecha',actions:[action('Outro')]}}]}]}]});
test('ações separam piloto/mecha, ranks e loadouts inativos, tipo e busca',()=>{
 const actions=allActions(raw());assert.deepEqual(unitActions(actions,-1).map(a=>a.name),['Rank I','Piloto']);assert.deepEqual(unitActions(actions,0).map(a=>a.name),['Ativo']);assert.deepEqual(unitActions(actions,0,{includeInactive:true}).map(a=>a.name),['Ativo','Inativo']);assert.equal(unitActions(actions,-1,{includeInactive:true}).length,3);assert.equal(unitActions(actions,0,{query:'regra',activation:'Quick'}).length,1);assert.equal(unitActions(actions,0,{activation:'Full'}).length,0);
});
test('hangar mostra apenas equipamentos do mecha e loadout selecionados com montagem correta',()=>{
 const data=raw(),all=entries(data);assert.deepEqual(loadoutEntries(all,0,0).map(e=>e.name),['Ativo']);const inactive=loadoutEntries(all,0,1);assert.deepEqual(inactive.map(e=>e.name),['Inativo']);assert.equal(mountTitle(inactive[0],data.mechs[0]),'Montagem 1 • Flex • Extra');const integrated=loadoutEntries(all,1,0);assert.equal(mountTitle(integrated[0],data.mechs[1]),'Sistema integrado');assert.deepEqual(loadoutEntries(all,-1,0).map(e=>e.name),['Piloto']);
});

test('remover ou desfazer mecha selecionado retorna ao piloto antes de renderizar',()=>{assert.equal(sheetUnitIndex(raw(),1),1);assert.equal(sheetUnitIndex({mechs:[]},1),-1);assert.equal(sheetUnitIndex(undefined,0),-1);assert.equal(sheetUnitIndex(raw(),-1),-1);});

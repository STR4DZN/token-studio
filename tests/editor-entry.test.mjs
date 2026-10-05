import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parse} from '@babel/parser';
import traversal from '@babel/traverse';
import {createProject} from '../src/engine.js';
import {replaceArtwork} from '../src/editor-artwork.js';
const traverse=traversal.default || traversal;
test('comandos reais do editor não usam funções sem importação',async()=>{
  const source=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8');
  const ast=parse(source,{sourceType:'module',plugins:['jsx']});
  const browser=new Set(['window','document','devicePixelRatio','FileReader','ResizeObserver','Image','localStorage','navigator','indexedDB','fetch','crypto','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','URL','Blob','TextDecoder','structuredClone','console']);
  const missing=new Set();
  traverse(ast,{ReferencedIdentifier(path){const name=path.node.name;if(!path.scope.hasBinding(name)&&!browser.has(name))missing.add(name);}});
  assert.deepEqual([...missing],[]);
});
test('uma escolha prepara retrato limpo e token com moldura sem compartilhar ajustes',()=>{
  const old=createProject('old.png');old.views.portrait.frame='gold';old.views.token.frame='custom';old.views.token.frameSrc='border.webp';old.views.token.zoom=3;
  const next=replaceArtwork(old,'new.webp');
  assert.equal(next.views.token.src,'new.webp');assert.equal(next.views.portrait.src,'new.webp');
  assert.equal(next.views.portrait.frame,'none');assert.equal(next.views.portrait.shape,'rectangle');assert.equal(next.views.portrait.aspect,'2:3');
  assert.equal(next.views.token.frame,'custom');assert.equal(next.views.token.frameSrc,'border.webp');assert.equal(next.views.token.aspect,'1:1');
  next.views.token.zoom=2;assert.equal(next.views.portrait.zoom,1);assert.equal(old.views.token.src,'old.png');
});
test('opção de nova arte somente na edição atual preserva a outra origem',()=>{
  const old=createProject('old.png');old.active='portrait';old.views.token.zoom=2;
  const next=replaceArtwork(old,'new.webp',{both:false});
  assert.deepEqual(next.views.token,old.views.token);assert.equal(next.views.portrait.src,'new.webp');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {storeData,readData} from '../foundry/stored-data.js';

import {expandUpdate} from './helpers/expand-update.mjs';
const timestamps={'reserves.reserve_license':1790477053906,'reserves.reserve_license.id':1791228367601};
test('datas reais do COMP/CON reproduzem o erro mostrado pelo usuário',()=>{
  assert.throws(()=>expandUpdate({_ts:timestamps}),/Cannot use 'in' operator.*'id'.*1790477053906/);
});
test('flags preservam campos literais e passam pela expansão sem conflito',()=>{
  const data={data:{name:'Piloto',_ts:timestamps,cloud:{_ts:timestamps}},base:{_ts:timestamps}};
  const patch=expandUpdate({'flags.token-studio.sheetProject':storeData(data)});
  assert.deepEqual(readData(patch.flags['token-studio'].sheetProject),data);
});
test('leitura mantém compatibilidade com projetos antigos e itens simples',()=>{
  const legacy={data:{name:'Piloto'}};
  assert.equal(readData(legacy),legacy);
  assert.deepEqual(storeData(legacy),legacy);
  const item={data:{custom:{'a.b':1,'a.b.c':2}}};
  assert.deepEqual(readData(expandUpdate(storeData(item))),item);
});

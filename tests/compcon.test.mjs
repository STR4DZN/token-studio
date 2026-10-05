import test from 'node:test';
import assert from 'node:assert/strict';
import {pilotPortrait,downloadPortrait,shareCode,parsePilot,createSheet,validateSheet,downloadPilot,COMP_BUCKET,copy,setPath,mergePlan,applyMerge,diffData,entries,allActions,applyResolvedDamage,frequencyLimit} from '../src/compcon.js';
export const pilot=()=>({itemType:'pilot',id:'pilot-1',name:'Teste',callsign:'T',level:3,mechSkills:[1,2,0,0],mechs:[],skills:[],talents:[],loadouts:[{name:'Principal',armor:[],weapons:[],gear:[]}],active_index:0,stats:{current:{hp:10,overshield:3},max:{hp:12}},extension:{nested:{value:'preservar'},list:[1,'x']}});
test('links aceitam apenas o domínio, protocolo e código esperados',()=>{
 assert.equal(shareCode('https://compcon.app/link/pilot/1HM40U8YCU35/full/'),'1HM40U8YCU35');
 assert.equal(shareCode('1hm4-0u8y-cu35'),'1HM40U8YCU35');
 for(const url of ['https://compcon.app.evil/link/pilot/1HM40U8YCU35/full/','http://compcon.app/link/pilot/1HM40U8YCU35/full/','https://user:pw@compcon.app/link/pilot/1HM40U8YCU35/full/','https://compcon.app:123/link/pilot/1HM40U8YCU35/full/','https://evil.test/'])assert.throws(()=>shareCode(url));
});
test('importação e projeto preservam campos desconhecidos sem duplicar a resposta na origem',()=>{
 const raw=pilot(),sheet=createSheet(raw,{code:'123456789012',data:raw});
 assert.deepEqual(sheet.data,raw);assert.notEqual(sheet.data,raw);assert.equal(sheet.source.data,undefined);assert.deepEqual(validateSheet(JSON.parse(JSON.stringify(sheet))),sheet);
 assert.deepEqual(parsePilot({EXPORT_TYPE:'pilot',data:raw}),raw);
});
test('JSON hostil, listas inválidas e valores não JSON são recusados',()=>{
 assert.throws(()=>parsePilot('{"name":"X","callsign":"X","mechs":[],"__proto__":{}}'));
 assert.throws(()=>parsePilot({...pilot(),talents:{}}));assert.throws(()=>parsePilot({...pilot(),mechs:[null]}));assert.throws(()=>parsePilot({...pilot(),bad:undefined}));assert.throws(()=>setPath({},['__proto__','oops'],1));
});
test('consulta pública faz lookup seguido de leitura e nunca envia credenciais',async()=>{
 const calls=[],raw=pilot(),fetcher=async(url,options)=>{calls.push({url,options});return {ok:true,text:async()=>JSON.stringify(calls.length===1?[{code:'123456789012',uri:'public/pilot.json',item_modified:'today'}]:raw)};};
 const result=await downloadPilot('123456789012',{fetcher});assert.deepEqual(result.data,raw);assert.equal(result.remoteUpdated,'today');assert.equal(calls[1].url,COMP_BUCKET+'public/pilot.json');assert.equal(calls[0].options.credentials,'omit');assert.ok(calls[0].options.headers['x-api-key']);
});
test('origem desconhecida, limite de consultas e falha de rede têm erro explícito',async()=>{
 await assert.rejects(()=>downloadPilot('123456789012',{fetcher:async()=>({ok:true,text:async()=>JSON.stringify([{uri:'https://evil.test/a'}])})}),/origem/);
 await assert.rejects(()=>downloadPilot('123456789012',{fetcher:async()=>({ok:false,status:429})}),/limitou/);
 await assert.rejects(()=>downloadPilot('123456789012',{fetcher:async()=>{throw new TypeError('fetch failed');}}),/rede, CORS/);
});
test('atualização seleciona dados remotos intactos e preserva edições locais e conflitos',()=>{
 const base=pilot(),local=copy(base),incoming=copy(base);local.name='Local';local.extension.nested.value='local';incoming.name='Remoto';incoming.callsign='R';
 const changes=mergePlan(base,local,incoming),name=changes.find(c=>c.path[0]==='name'),ext=changes.find(c=>c.path.join('.')==='extension.nested.value');
 assert.equal(name.conflict,true);assert.equal(name.selected,false);assert.equal(ext.selected,false);
 const merged=applyMerge(local,changes,new Set(changes.filter(c=>c.selected).map(c=>c.key)));assert.equal(merged.name,'Local');assert.equal(merged.callsign,'R');assert.equal(merged.extension.nested.value,'local');
});
test('listas e mudanças de tipo são grupos atômicos de revisão',()=>{
 const a={a:{x:1},b:[1,2]},b={a:[3],b:[2,1]};const changes=diffData(a,b);assert.equal(changes.length,2);assert.deepEqual(applyMerge(a,changes,new Set(changes.map(c=>c.key))),b);
 const reversed=diffData(b,a);assert.deepEqual(applyMerge(b,reversed,new Set(reversed.map(c=>c.key))),a);
});
test('ações respeitam rank e loadout; edições conservam o caminho de montagens extras e mods',()=>{
 const raw=pilot();raw.talents=[{id:'t',rank:1,data:{id:'t',name:'T',ranks:[{actions:[{name:'I'}]},{actions:[{name:'II'}]}]}}];
 raw.loadouts.push({name:'Reserva',armor:[],weapons:[],gear:[{data:{id:'g',name:'G',actions:[{name:'Reserva'}]}}]});
 raw.mechs=[{id:'m',name:'M',loadouts:[{mounts:[],improved_armament:{slots:[{weapon:{id:'w',data:{name:'W'},mod:{id:'mod',data:{name:'Mod'}}}}]}}]}];
 const actions=allActions(raw);assert.equal(actions.find(a=>a.name==='I').active,true);assert.equal(actions.find(a=>a.name==='II').active,false);assert.equal(actions.find(a=>a.name==='Reserva').active,false);
 const es=entries(raw);assert.deepEqual(es.find(e=>e.kind==='mech_weapons').path,['mechs',0,'loadouts',0,'improved_armament','slots',0,'weapon']);assert.equal(es.find(e=>e.kind==='weapon_mods').path.at(-1),'mod');
});
test('dano final consome overshield antes de vida, recuperação é limitada e fonte permanece intacta',()=>{
 const sheet=createSheet(pilot()),damaged=applyResolvedDamage(sheet,[],7);assert.equal(damaged.data.stats.current.hp,6);assert.equal(damaged.data.stats.current.overshield,0);assert.equal(sheet.data.stats.current.hp,10);
 assert.equal(applyResolvedDamage(damaged,[],100,true).data.stats.current.hp,12);assert.throws(()=>applyResolvedDamage(sheet,[],-1));assert.throws(()=>applyResolvedDamage(sheet,[],0.5));
});
test('frequência só limita formatos conhecidos, sem inferir regras especiais',()=>{
 assert.deepEqual(frequencyLimit('2/Scene'),{limit:2,period:'scene'});assert.equal(frequencyLimit('Unlimited'),null);assert.equal(frequencyLimit('Especial'),null);
});

test('projetos com metadados ou contadores corrompidos são recusados antes de renderizar',()=>{
 const sheet=createSheet(pilot());assert.throws(()=>validateSheet({...sheet,source:null}));assert.throws(()=>validateSheet({...sheet,source:{...sheet.source,filename:{bad:true}}}));assert.throws(()=>validateSheet({...sheet,tracking:{round:1,uses:{a:{bad:true}}}}));
});

test('retrato usa campos COMP/CON v3, aceita legado e recusa fontes inválidas',()=>{
 assert.equal(pilotPortrait({img:{cloud_portrait:'https://img.test/cloud.webp',portrait:'https://img.test/local.png'}}),'https://img.test/cloud.webp');
 assert.equal(pilotPortrait({cloud_portrait:'https://img.test/legacy.png'}),'https://img.test/legacy.png');
 assert.equal(pilotPortrait({img:{portrait:'/img/pilot/a.webp'}}),'https://compcon.app/img/pilot/a.webp');
 assert.equal(pilotPortrait({img:{portrait:'data:image/png;base64,iVBORw=='}}),'data:image/png;base64,iVBORw==');
 assert.equal(pilotPortrait({}),'');
 for(const source of ['javascript:alert(1)','http://img.test/a','https://u:p@img.test/a','data:text/html;base64,AA==',12]) assert.throws(()=>pilotPortrait({img:{cloud_portrait:source}}));
});
test('download identifica bytes da imagem e recusa páginas de erro, rede e excesso de tamanho',async()=>{
 const signatures=[[[137,80,78,71,13,10,26,10],'image/png'],[[255,216,255,0],'image/jpeg'],[Array.from(Buffer.from('GIF89a000000')),'image/gif'],[Array.from(Buffer.from('RIFF0000WEBP')),'image/webp']];
 for(const [bytes,type]of signatures){let options;const blob=await downloadPortrait('https://img.test/a',{fetcher:async(_,o)=>{options=o;return new Response(new Uint8Array(bytes),{headers:{'content-type':'application/octet-stream'}});}});assert.equal(blob.type,type);assert.equal(options.credentials,'omit');assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),new Uint8Array(bytes));}
 await assert.rejects(()=>downloadPortrait('https://img.test/a',{fetcher:async()=>new Response('<html>error</html>')}),/imagem.*válida/);
 await assert.rejects(()=>downloadPortrait('https://img.test/a',{fetcher:async()=>new Response('',{status:404})}),/404/);
 await assert.rejects(()=>downloadPortrait('https://img.test/a',{fetcher:async()=>{throw new Error('CORS');}}),/baixar/);
 await assert.rejects(()=>downloadPortrait('https://img.test/a',{fetcher:async()=>new Response('x',{headers:{'content-length':String(31*1024*1024)}})}),/30 MB/);
});

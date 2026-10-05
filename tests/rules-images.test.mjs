import test from 'node:test';
import assert from 'node:assert/strict';
import {ruleGroups,sheetDiagnostics} from '../src/sheet-rules.js';
import {allActions,getPath} from '../src/compcon.js';
import {imageURL,imageURLWarnings,resolveImageURL,validateImageURL} from '../src/image-url.js';
import {imageFilename,storedImage} from '../src/image-storage.js';

const action=name=>({name,activation:'Quick',detail:'<p>Efeito da ação</p>',frequency:'1/round'});
const weapon=(name)=>({id:name,data:{name,actions:[action('Disparo')],passive_actions:[{name:'Mira passiva',activation:'Passive',detail:'Precisão'}],effect:'Regra adicional',effects:['Outro efeito'],profiles:[{name:'Modo B',effect:'Ataque alternativo'}]}});
const fixture=()=>({name:'Piloto',callsign:'P',mechs:[{name:'Everest',frame:'mf_everest',frameData:{name:'Everest',traits:[{name:'Initiative',description:'Uma ação livre'}],core_system:{name:'Core',passive_effect:'Passiva do core',active_effect:'Ativo do core'}},active_loadout_index:0,loadouts:[{name:'Principal',mounts:[{mount_type:'Main',slots:[{weapon:weapon('Rifle X')}]}],systems:[{id:'s1',data:{name:'Escudo',effect:'Proteção'}}]},{name:'Reserva',systems:[{id:'s2',data:{name:'Sistema reserva',actions:[action('Reação reserva')]}}]}]},{name:'Outro mecha',loadouts:[{systems:[{id:'s3',data:{name:'Outro sistema',actions:[action('Outra ação')]}}]}]}],talents:[{id:'t',rank:1,data:{name:'Talento',ranks:[{name:'Rank I',description:'Regra I',actions:[action('Adquirido')]},{name:'Rank II',actions:[action('Não adquirido')]}]}}],loadouts:[{weapons:[weapon('Arma do piloto')]}]});
test('agrupa armas/sistemas/frame por instância sem contar efeitos internos de ações novamente',()=>{
 const raw=fixture(),before=structuredClone(raw),groups=ruleGroups(raw,0),rifle=groups.find(g=>g.name==='Rifle X');
 assert.deepEqual(rifle.counts,{action:1,passive:1,effect:3,info:0});assert.equal(groups.length,3);assert.equal(groups.some(g=>g.name==='Outro sistema'),false);
 assert.equal(groups.find(g=>g.origin==='frame').counts.passive,2);assert.deepEqual(raw,before);
 for(const rule of rifle.rules)assert.deepEqual(getPath(raw,rule.path),rule.action||rule.value);
});
test('filtros combinam origem, tipo, ativação, busca, rank e loadout',()=>{
 const raw=fixture();assert.equal(ruleGroups(raw,0,{origin:'weapons',kind:'passive'}).length,1);assert.equal(ruleGroups(raw,0,{activation:'Quick'}).length,1);
 assert.equal(ruleGroups(raw,0,{query:'ataque alternativo'})[0].name,'Rifle X');assert.equal(ruleGroups(raw,0,{query:'reserva'}).length,0);assert.equal(ruleGroups(raw,0,{query:'reserva',includeInactive:true}).length,1);
 assert.equal(ruleGroups(raw,-1,{origin:'talents'})[0].counts.action,1);assert.equal(ruleGroups(raw,-1,{origin:'talents',includeInactive:true})[0].counts.action,2);
});
test('bond e regras extras têm origem; ações inválidas são diagnosticadas sem derrubar a ficha',()=>{
 const raw=fixture();raw.bondData={name:'Bond',actions:[action('Bond action')]};raw.custom_rules={mystery:'Regra preservada'};raw.talents[0].data.ranks[0].actions.push(null,'invalid');raw.mechs[0].loadouts[0].systems.push({id:'missing'});raw.mechs[1].frame='missing-frame';raw.active_index=99;
 const issues=sheetDiagnostics(raw);assert.ok(issues.some(i=>i.reason.includes('inválida')));assert.ok(issues.some(i=>i.name==='missing'));assert.ok(issues.some(i=>i.reason.includes('sem classificação')));assert.ok(issues.some(i=>i.reason.includes('sem definição')));assert.ok(issues.some(i=>i.reason.includes('Loadout ativo')));
 assert.ok(allActions(raw).some(a=>a.name==='Bond action'));assert.ok(ruleGroups(raw,-1).some(g=>g.name==='Bond'));assert.equal(raw.custom_rules.mystery,'Regra preservada');
});
test('instâncias repetidas no mesmo loadout são sinalizadas; mesmo LID não gera falso duplicado',()=>{
 const raw=fixture(),slots=raw.mechs[0].loadouts[0].mounts[0].slots;slots.push({weapon:structuredClone(slots[0].weapon)});assert.equal(sheetDiagnostics(raw).some(i=>i.reason.includes('instância')),false);
 slots.forEach(s=>s.weapon.instance_id='same-instance');assert.equal(sheetDiagnostics(raw).filter(i=>i.reason.includes('instância')).length,1);
});
test('URLs aceitam HTTPS e Google imgurl, preservam assinatura e rejeitam protocolos/credenciais',()=>{
 const original='https://i.pinimg.com/originals/a.png?sig=abc';assert.equal(imageURL('https://www.google.com/imgres?imgurl='+encodeURIComponent(original)),original);
 for(const value of ['javascript:alert(1)','data:image/png;base64,AA==','http://img.test/a.png','https://user:pass@img.test/a.png','not-url'])assert.throws(()=>imageURL(value));
 assert.equal(imageURL('https://img.test/a.png?signature=1#part'),'https://img.test/a.png?signature=1');
});
test('Discord avisa sobre expiração e recusa link já expirado',()=>{
 const make=expiry=>'https://cdn.discordapp.com/attachments/a/b/c.png?ex='+Math.floor(expiry/1000).toString(16)+'&hm=sig';assert.equal(imageURLWarnings(make(300000),200000).length,1);assert.throws(()=>imageURLWarnings(make(100000),200000),/expirou/);assert.deepEqual(imageURLWarnings('https://cdn.discordapp.com/avatars/a/b.png'),[]);
});
const png=()=>new Response(new Uint8Array([137,80,78,71,13,10,26,10]),{headers:{'content-type':'image/png'}});
test('retrato pode usar URL apenas para visualização, sem liberar exportação',async()=>{
 const calls=[];const options={fetcher:async()=>{throw Error('CORS');},probe:async(src,opts)=>{calls.push(opts?.editable!==false);if(opts?.editable!==false)throw Error('CORS');return{width:814,height:1200};}};
 await assert.rejects(validateImageURL('https://img.test/p.png',options),/CORS/);calls.length=0;
 const result=await validateImageURL('https://img.test/p.png',{...options,allowDisplayOnly:true});assert.equal(result.editable,false);assert.equal(result.blob,null);assert.deepEqual(calls,[true,false]);assert.match(result.warnings[0],/preservada/);
});
test('imagem por URL valida bytes sem upload e sem credenciais',async()=>{
 const url='https://img.test/a.png',calls=[];const result=await resolveImageURL(url,{fetcher:async(u,o)=>{calls.push({u,o});return png();}});assert.equal(result.url,url);assert.equal(result.blob.type,'image/png');assert.equal(calls.length,1);assert.equal(calls[0].o.credentials,'omit');assert.equal(calls[0].o.referrerPolicy,'no-referrer');
});
test('página pública resolve imagem de prévia quando acessível; HTML sem imagem falha explicitamente',async()=>{
 let calls=0;const result=await resolveImageURL('https://site.test/pin',{parseHTML:()=>'/image.png',fetcher:async()=>++calls===1?new Response('<html/>',{headers:{'content-type':'text/html'}}):png()});assert.equal(result.url,'https://site.test/image.png');assert.equal(calls,2);
 await assert.rejects(resolveImageURL('https://site.test/page',{parseHTML:()=>null,fetcher:async()=>new Response('<html/>',{headers:{'content-type':'text/html'}})}),/página/);
});
test('erro de rede/CORS, arquivo inválido, excesso de tamanho e HTTP não são aplicados',async()=>{
 for(const fetcher of [async()=>{throw Error('CORS');},async()=>new Response('bad'),async()=>new Response('bad',{status:404}),async()=>new Response('bad',{headers:{'content-length':String(31*1024*1024)}})])await assert.rejects(resolveImageURL('https://img.test/a.png',{fetcher}));
});
test('armazenamento usa conteúdo, distingue bytes e reutiliza o nome entre atores',async()=>{
 const a=new Blob(['a'],{type:'image/png'}),b=new Blob(['b'],{type:'image/png'}),name=await imageFilename(a);assert.equal(name,await imageFilename(new Blob(['a'],{type:'image/png'})));assert.notEqual(name,await imageFilename(b));assert.equal(storedImage(['token-studio/images/'+name],name),'token-studio/images/'+name);assert.equal(storedImage([],name),undefined);
});

test('regras None ficam entre passivas sem perder gatilho ou frequência',()=>{const raw=fixture();raw.mechs[0].loadouts[0].systems[0].data.actions=[{name:'Automática',activation:'None',trigger:'Ao acertar',frequency:'1/round'}];const group=ruleGroups(raw,0,{origin:'systems'})[0];assert.equal(group.counts.passive,1);assert.equal(group.rules.find(r=>r.action)?.action.trigger,'Ao acertar');});

test('validação alternativa usa imagem CORS e exige leitura de pixel antes de aceitar URL',async()=>{let probed='';const result=await validateImageURL('https://img.test/a.png',{fetcher:async()=>{throw Error('fetch failed');},probe:async src=>{probed=src;return{width:10,height:20};}});assert.equal(probed,result.url);assert.equal(result.blob,null);await assert.rejects(validateImageURL('https://img.test/a.png',{fetcher:async()=>{throw Error('fetch failed');},probe:async()=>{throw Error('CORS denied');}}),/CORS/);});

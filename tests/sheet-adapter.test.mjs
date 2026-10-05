import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../src/engine.js';
import {createSheet,copy,setPath}from'../src/compcon.js';
import {prepareSheetPlan,applySheetPlan,readNativePilot,toNativeItem}from'../foundry/sheet-adapter.js';
const raw=()=>({itemType:'pilot',id:'p',name:'Novo',callsign:'N',level:3,mechSkills:[2,1,0,0],skills:[{id:'s',rank:2,data:{id:'s',name:'Skill',description:'<p>Texto</p>'}}],talents:[],mechs:[],loadouts:[{name:'A',armor:[],weapons:[{id:'w',instanceId:'weapon-1',data:{id:'w',name:'Arma',damage:[{type:'Kinetic',val:3}],range:[{type:'Range',val:5}]}}],gear:[]}],active_index:0,stats:{current:{hp:9},max:{hp:30}},notes:'Notas'});
class FakeActor{
 constructor({name='Anterior',type='pilot',system={},items=[],flags={},id='p'}={}){this.id=id;this.uuid=`Actor.${id}`;this.type=type;this.name=name;this.system=copy(system);this.flags=copy(flags);this.img='arte.png';this.prototypeToken={texture:{src:'token.png'}};this.items={contents:items.map(x=>this.wrap(x))};this.writes=0;}
 wrap(data){const d=copy(data);return{id:d._id,uuid:`${this.uuid}.Item.${d._id}`,name:d.name,type:d.type,system:d.system,flags:d.flags||{},getFlag:(ns,k)=>d.flags?.[ns]?.[k],toObject:()=>copy(d)};}
 getFlag(ns,k){return this.flags?.[ns]?.[k];}canUserModify(){return true;}
 toObject(){return{_id:this.id,name:this.name,type:this.type,system:copy(this.system),items:this.items.contents.map(x=>x.toObject()),flags:copy(this.flags),img:this.img,prototypeToken:copy(this.prototypeToken)};}
 async createEmbeddedDocuments(_,docs,{keepId=false}={}){this.writes++;const made=docs.map((d,i)=>this.wrap({...d,_id:keepId?d._id:`created-${this.items.contents.length+i}`}));this.items.contents.push(...made);return made;}
 async updateEmbeddedDocuments(_,docs){this.writes++;for(const d of docs){const i=this.items.contents.findIndex(x=>x.id===d._id);this.items.contents[i]=this.wrap(d);}return docs;}
 async deleteEmbeddedDocuments(_,ids){this.writes++;this.items.contents=this.items.contents.filter(x=>!ids.includes(x.id));}
 async update(patch){this.writes++;if(this.failOnce){this.failOnce=false;throw new Error('falha simulada');}for(const[k,v]of Object.entries(patch)){if(k.includes('.'))setPath(this,k.split('.'),v);else this[k]=copy(v);}return this;}
 async delete(){this.deleted=true;}
}
const gameFor=(actors=[])=>({user:{isGM:true},system:{id:'lancer'},actors:{contents:actors}});
const parts={identity:true,build:true,combat:false,mechs:false};
test('URL somente para visualização preserva textura padrão e projeto do token',async()=>{
 const data=raw();data.img={cloud_portrait:'https://img.test/p.png'};const project=createProject('old.png');project.views.token.zoom=2;
 const actor=new FakeActor({flags:{'token-studio':{project}}});actor.prototypeToken.texture.src='systems/lancer/assets/icons/pilot.svg';
 const tokenBefore=copy(actor.prototypeToken.texture),sheet=createSheet(data),plan=await prepare(actor,sheet,{portrait:true});
 const result=await applySheetPlan({plan,sheet,game:gameFor([actor]),resolvePortrait:async()=>({url:data.img.cloud_portrait,editable:false})});
 assert.equal(actor.img,data.img.cloud_portrait);assert.deepEqual(actor.prototypeToken.texture,tokenBefore);assert.deepEqual(actor.flags['token-studio'].project.views.token,project.views.token);assert.equal(actor.flags['token-studio'].project.views.portrait.displayOnly,true);assert.equal(result.portraitEditable,false);assert.equal(actor.flags['token-studio'].portraitSource.local,null);
 const next=await prepare(actor,sheet,{portrait:false});const unchanged=await applySheetPlan({plan:next,sheet,game:gameFor([actor])});assert.equal(unchanged.portraitEditable,false);
});
async function prepare(actor,sheet=createSheet(raw()),options={}){return prepareSheetPlan({actor,sheet,parts:{...parts,...options},game:gameFor([actor])});}
test('revisão é somente leitura e aplica identidade/build sem tocar arte nem combate',async()=>{
 const actor=new FakeActor({system:{hp:{value:5},loadout:{}}}),before=actor.toObject(),sheet=createSheet(raw()),plan=await prepare(actor,sheet);assert.deepEqual(actor.toObject(),before);assert.equal(actor.writes,0);
 let backup;await applySheetPlan({plan,sheet,game:gameFor([actor]),saveBackup:async docs=>{backup=docs;}});
 assert.equal(actor.name,'Novo');assert.equal(actor.system.hp.value,5);assert.equal(actor.system.hull,2);assert.equal(actor.system.level,3);assert.equal(actor.system.loadout.weapons.length,1);assert.equal(actor.img,'arte.png');assert.equal(actor.prototypeToken.texture.src,'token.png');assert.deepEqual(backup,[before]);assert.equal(actor.flags['token-studio'].sheetProject.data.stats.max.hp,30);
});
test('itens externos com mesmo LID bloqueiam duplicação e exigem adoção explícita',async()=>{
 const actor=new FakeActor({items:[{_id:'s1',name:'Externo',type:'skill',system:{lid:'s',curr_rank:1}}]});const plan=await prepare(actor);assert.equal(plan.blocked,true);assert.equal(actor.writes,0);
 const adopted=await prepare(actor,createSheet(raw()),{adopt:true});assert.equal(adopted.blocked,false);assert.equal(adopted.documents[0].items.find(o=>o.key==='skill:s').id,'s1');
});
test('remoção opcional alcança apenas itens gerenciados ausentes',async()=>{
 const actor=new FakeActor({items:[{_id:'old',name:'Velho',type:'skill',system:{lid:'old'},flags:{'token-studio':{sheetKey:'skill:old'}}},{_id:'other',name:'Outro',type:'skill',system:{lid:'other'}}]});
 assert.equal((await prepare(actor)).documents[0].items.some(o=>o.kind==='delete'),false);const plan=await prepare(actor,createSheet(raw()),{removeManaged:true});assert.deepEqual(plan.documents[0].items.filter(o=>o.kind==='delete').map(o=>o.id),['old']);
});
test('mesma instância em dois loadouts gera um único item e referências válidas',async()=>{
 const data=raw();data.loadouts.push(copy(data.loadouts[0]));data.active_index=1;const sheet=createSheet(data),actor=new FakeActor(),plan=await prepare(actor,sheet);assert.equal(plan.documents[0].items.filter(o=>o.data?.type==='pilot_weapon').length,1);await applySheetPlan({plan,sheet,game:gameFor([actor])});assert.equal(actor.system.loadout.weapons.length,1);
});
test('alteração concorrente no ator ou no rascunho impede a aplicação',async()=>{
 const actor=new FakeActor(),sheet=createSheet(raw()),plan=await prepare(actor,sheet);actor.name='Mudou';await assert.rejects(()=>applySheetPlan({plan,sheet,game:gameFor([actor])}),/mudou no Foundry/);assert.equal(actor.writes,0);
 actor.name='Anterior';sheet.data.level=4;await assert.rejects(()=>applySheetPlan({plan,sheet,game:gameFor([actor])}),/rascunho mudou/);assert.equal(actor.writes,0);
});
test('validação recusada pelo sistema bloqueia todas as alterações',async()=>{
 const actor=new FakeActor(),sheet=createSheet(raw()),plan=await prepareSheetPlan({actor,sheet,parts,game:gameFor([actor]),validateItem:async()=>{throw new Error('schema');}});assert.equal(plan.blocked,true);await assert.rejects(()=>applySheetPlan({plan,sheet,game:gameFor([actor])}),/impedimentos/);assert.equal(actor.writes,0);
});
test('falha de atualização restaura itens e dados anteriores',async()=>{
 const actor=new FakeActor({items:[{_id:'external',type:'pilot_gear',name:'Pessoal',system:{lid:'ext'},flags:{}}]}),before=actor.toObject(),sheet=createSheet(raw()),plan=await prepare(actor,sheet);actor.failOnce=true;await assert.rejects(()=>applySheetPlan({plan,sheet,game:gameFor([actor])}),/restaurados/);assert.deepEqual(actor.toObject(),before);
});
test('falha de backup não inicia nenhuma escrita',async()=>{
 const actor=new FakeActor(),sheet=createSheet(raw()),plan=await prepare(actor,sheet);await assert.rejects(()=>applySheetPlan({plan,sheet,game:gameFor([actor]),saveBackup:async()=>{throw new Error('upload');}}),/upload/);assert.equal(actor.writes,0);
});
test('permissões e sistema são conferidos novamente no momento de aplicar',async()=>{
 const actor=new FakeActor(),sheet=createSheet(raw()),plan=await prepare(actor,sheet);const game=gameFor();game.user.isGM=false;await assert.rejects(()=>applySheetPlan({plan,sheet,game}),/mestre/);game.user.isGM=true;game.system.id='outro';await assert.rejects(()=>applySheetPlan({plan,sheet,game}),/Lancer/);
});
test('leitura nativa inclui mecha vinculado, frame, arma, mod e recursos',()=>{
 const actor=new FakeActor({system:{callsign:'Native',level:2,hp:{value:7,max:12},loadout:{}}});const mech=new FakeActor({id:'m',name:'Mecha',type:'mech',system:{lid:'m1',pilot:actor.uuid,hp:{value:5,max:10},repairs:{value:2,max:3},loadout:{frame:'f',systems:[],weapon_mounts:[{type:'Main',slots:[{weapon:'w',mod:'mod',size:'Main'}]}]}},items:[{_id:'f',type:'frame',name:'Frame',system:{lid:'f1',stats:{hp:10}}},{_id:'w',type:'mech_weapon',name:'Rifle',system:{lid:'w1',size:'Main',loaded:false,profiles:[]}},{_id:'mod',type:'weapon_mod',name:'Mod',system:{lid:'mod1'}}]});const data=readNativePilot(actor,gameFor([actor,mech]));assert.equal(data.mechs.length,1);assert.equal(data.mechs[0].stats.current.repairCapacity,2);assert.equal(data.mechs[0].frameData.name,'Frame');assert.equal(data.mechs[0].loadouts[0].mounts[0].slots[0].weapon.mod.data.name,'Mod');assert.equal(data.stats.current.hp,7);
});
test('mecha novo exige build e referências de montagens são resolvidas',async()=>{
 const data=raw();data.mechs=[{id:'m1',name:'Mecha',frameData:{id:'f',name:'Frame',stats:{hp:10},mounts:['Main']},stats:{current:{hp:8}},loadouts:[{systems:[],mounts:[{mount_type:'Main',slots:[{size:'Main',weapon:{id:'w',instanceId:'w1',data:{id:'w',name:'Rifle',mount:'Main',type:'Rifle'},mod:{id:'mod',data:{id:'mod',name:'Mod',sp:1}}}}]}]}]}];
 const actor=new FakeActor(),sheet=createSheet(data);await assert.rejects(()=>prepare(actor,sheet,{mechs:true,build:false}),/também Build/);
 const plan=await prepare(actor,sheet,{mechs:true,combat:true});let made;await applySheetPlan({plan,sheet,game:gameFor([actor]),createActor:async config=>(made=new FakeActor({...config,id:'createdMech'}))});assert.ok(made.system.loadout.frame);assert.ok(made.system.loadout.weapon_mounts[0].slots[0].weapon);assert.ok(made.system.loadout.weapon_mounts[0].slots[0].mod);assert.equal(made.system.pilot,actor.uuid);assert.equal(made.system.hp.value,8);
});
test('item nativo mantém definição completa nos flags próprios e tipa dano como texto',()=>{
 const e={kind:'weapons',item:{id:'w',currentUses:2},data:{id:'w',name:'W',damage:[{val:4,type:'Kinetic'}],range:[],custom:'X'},key:'w'};const item=toNativeItem(e);assert.equal(item.system.damage[0].val,'4');assert.deepEqual(item.flags['token-studio'].packed,e.item);assert.equal(item.system.uses.value,2);
});

test('vínculo completo aplica retrato local, código e data preservando arte/ajustes do token',async()=>{
 const data=raw();data.img={cloud_portrait:'https://img.test/pilot.webp'};
 const project=createProject('old.png');Object.assign(project.views.token,{src:'custom.webp',zoom:2.5,x:.3,frame:'gold'});
 const actor=new FakeActor({flags:{'token-studio':{project}}});actor.prototypeToken={name:'Velho',actorLink:false,texture:{src:'custom.webp',scaleX:1.7,scaleY:.8},ring:{enabled:true},sight:{range:60}};
 const tokenBefore=copy(actor.prototypeToken),sheet=createSheet(data,{kind:'compcon',code:'123456789012'}),plan=await prepare(actor,sheet,{portrait:true,combat:true});
 assert.equal(plan.documents[0].patch.img,data.img.cloud_portrait);assert.ok(plan.changes.some(x=>x.field==='img'));
 let downloaded;await applySheetPlan({plan,sheet,game:gameFor([actor]),resolvePortrait:async(a,url)=>{downloaded=[a,url];return 'token-studio/p/compcon-originals/pilot.webp';}});
 assert.deepEqual(downloaded,[actor,data.img.cloud_portrait]);assert.equal(actor.img,'token-studio/p/compcon-originals/pilot.webp');assert.equal(actor.system.cloud_id,'123456789012');assert.match(actor.system.last_cloud_update,/^\d{4}-/);
 assert.deepEqual(actor.prototypeToken,{...tokenBefore,name:'Novo',actorLink:true});assert.deepEqual(actor.flags['token-studio'].project.views.token,project.views.token);assert.equal(actor.flags['token-studio'].project.views.portrait.src,actor.img);
 assert.equal(actor.flags['token-studio'].sheetProject.source.actorUuid,actor.uuid);assert.equal(actor.flags['token-studio'].sheetProject.source.code,'123456789012');assert.equal(actor.flags['token-studio'].compconLink.pilotId,'p');
 const native=readNativePilot(actor,gameFor([actor]));assert.equal(native.cloudID,'123456789012');assert.equal(native.img.cloud_portrait,data.img.cloud_portrait);
 data.img.cloud_portrait='https://img.test/new.png';const updated=createSheet(data,{code:'123456789012'}),nextPlan=await prepare(actor,updated,{portrait:true});await applySheetPlan({plan:nextPlan,sheet:updated,game:gameFor([actor]),resolvePortrait:async()=> 'token-studio/p/compcon-originals/new.png'});assert.equal(actor.img,'token-studio/p/compcon-originals/new.png');assert.deepEqual(actor.flags['token-studio'].project.views.token,project.views.token);assert.deepEqual(actor.prototypeToken.texture,tokenBefore.texture);
});
test('token padrão recebe retrato e importação JSON conserva código legado',async()=>{
 const data=raw();data.img={portrait:'https://img.test/pilot.png'};data.cloudID='123456789012';const sheet=createSheet(data),actor=new FakeActor();actor.prototypeToken={texture:{src:'systems/lancer/assets/icons/pilot.svg',scaleX:1.5},ring:{enabled:false}};
 const plan=await prepare(actor,sheet,{portrait:true});await applySheetPlan({plan,sheet,game:gameFor([actor]),resolvePortrait:async()=> 'local/pilot.png'});assert.equal(actor.prototypeToken.texture.src,'local/pilot.png');assert.equal(actor.prototypeToken.texture.scaleX,1.5);assert.equal(actor.system.cloud_id,data.cloudID);assert.equal(actor.flags['token-studio'].sheetProject.source.code,data.cloudID);
});
test('retrato opcional ou ausente preserva imagem e não inicia download',async()=>{
 for(const portrait of [false,true]){const data=raw();if(!portrait)data.img={cloud_portrait:'https://img.test/p.png'};const sheet=createSheet(data),actor=new FakeActor(),plan=await prepare(actor,sheet,{portrait});await applySheetPlan({plan,sheet,game:gameFor([actor]),resolvePortrait:async()=>{throw new Error('download inesperado');}});assert.equal(actor.img,'arte.png');}
});
test('falha ou alteração concorrente durante download impede escrita no ator',async()=>{
 const data=raw();data.img={cloud_portrait:'https://img.test/p.png'};
 for(const concurrent of [false,true]){const actor=new FakeActor(),sheet=createSheet(data),plan=await prepare(actor,sheet,{portrait:true});let backups=0;await assert.rejects(()=>applySheetPlan({plan,sheet,game:gameFor([actor]),saveBackup:async()=>backups++,resolvePortrait:async()=>{if(!concurrent)throw new Error('imagem indisponível');actor.name='Edição externa';return 'local/p.png';}}),concurrent?/mudou no Foundry/:/indisponível/);assert.equal(actor.writes,0);assert.equal(backups,0);}
});
test('troca de código após revisão ou edição durante backup impede escrita',async()=>{
 const actor=new FakeActor(),sheet=createSheet(raw(),{code:'123456789012'}),plan=await prepare(actor,sheet);sheet.source.code='999999999999';await assert.rejects(()=>applySheetPlan({plan,sheet,game:gameFor([actor])}),/rascunho mudou/);assert.equal(actor.writes,0);
 sheet.source.code='123456789012';await assert.rejects(()=>applySheetPlan({plan,sheet,game:gameFor([actor]),saveBackup:async()=>{actor.name='Edição externa';}}),/durante o backup/);assert.equal(actor.writes,0);
});
test('falha no mecha restaura também retrato, vínculo e token do piloto',async()=>{
 const data=raw();data.img={cloud_portrait:'https://img.test/p.png'};data.mechs=[{id:'m1',name:'Mecha',loadouts:[]}];
 const actor=new FakeActor(),mech=new FakeActor({id:'m',type:'mech',system:{lid:'m1',pilot:actor.uuid}}),game=gameFor([actor,mech]),before=[actor.toObject(),mech.toObject()],sheet=createSheet(data,{code:'123456789012'});
 const plan=await prepareSheetPlan({actor,sheet,parts:{...parts,portrait:true,mechs:true},game});mech.failOnce=true;await assert.rejects(()=>applySheetPlan({plan,sheet,game,resolvePortrait:async()=> 'local/p.png'}),/restaurados/);assert.deepEqual([actor.toObject(),mech.toObject()],before);
});

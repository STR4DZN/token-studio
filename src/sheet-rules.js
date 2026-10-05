import {entries, ruleEntries, pilotPortrait} from './compcon.js';
import {imageURLWarnings} from './image-url.js';

export const originLabels = {weapons:'Armas',systems:'Sistemas',frame:'Frame',talents:'Talentos',core_bonuses:'Core bonuses',armor:'Armaduras',gear:'Gear',skills:'Gatilhos',licenses:'Licenças',reserves:'Reservas',orgs:'Organizações',other:'Outros'};
export const ruleLabels = {action:'Ações',passive:'Passivas',effect:'Efeitos',info:'Descrições'};
const actionFields = new Set(['actions','active_actions','passive_actions']);
const textFields = new Set(['effect','effects','active_effect','passive_effect','passive','active','description','detail','terse','on_hit','on_crit','on_attack','on_miss','trigger']);
const fieldNames={effect:'Efeito',effects:'Efeito',active_effect:'Efeito ativo',passive_effect:'Passiva',passive:'Passiva',active:'Efeito ativo',description:'Descrição',detail:'Detalhes',terse:'Resumo',on_hit:'Ao acertar',on_crit:'Ao causar crítico',on_attack:'Ao atacar',on_miss:'Ao errar',trigger:'Gatilho'};
const text = value => String(value ?? '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const scope = (path,index) => index<0 ? path[0]!=='mechs' : path[0]==='mechs' && path[1]===index;
const category = kind => ['weapons','mech_weapons','weapon_mods'].includes(kind)?'weapons':Object.hasOwn(originLabels,kind)?kind:'other';
export function entryActive(raw,e) {
  return e.path[0]==='loadouts' ? e.path[1]===(raw.active_index||0) : e.path[0]==='mechs' && e.path[2]==='loadouts' ? e.path[3]===(raw.mechs[e.path[1]]?.active_loadout_index||0) : true;
}
export function ruleGroups(raw,index,{includeInactive=false,origin='',kind='',activation='',query=''}={}) {
  const definitions=ruleEntries(raw), term=text(query).toLowerCase();
  return definitions.filter(e=>scope(e.path,index)).map(entry=>{
    const rules=[], active=entryActive(raw,entry), origin=category(entry.kind);
    function visit(value,path,owner,isActive,depth=0) {
      if(!value || typeof value!=='object' || depth>24)return;
      if(Array.isArray(value)){value.forEach((v,i)=>visit(v,[...path,i],`${owner} • ${v?.name||v?.id||`${path.at(-1)} ${i+1}`}`,isActive,depth+1));return;}
      for(const [key,v] of Object.entries(value)) {
        if(actionFields.has(key)) {
          if(Array.isArray(v))v.forEach((action,i)=>{if(action && typeof action==='object' && !Array.isArray(action)) {
            const actionPath=[...path,key,i];rules.push({key:JSON.stringify(actionPath),path:actionPath,owner,name:action.name||'Ação',action,active:isActive,type:key==='passive_actions'||/^(passive|none)$/i.test(action.activation||'')?'passive':'action'});
          }});
          continue;
        }
        if(key==='brew'||key==='mod')continue;
        const next=[...path,key];
        if(key==='ranks' && Array.isArray(v)){v.forEach((rank,i)=>visit(rank,[...next,i],`${entry.name} • ${rank?.name||`Rank ${i+1}`}`,isActive && i<(entry.item.rank??3),depth+1));continue;}
        if(textFields.has(key) && typeof v==='string' && text(v)) {
          const type=key.startsWith('passive') || path.includes('traits') || path.includes('passive') ?'passive':['description','detail','terse'].includes(key)?'info':'effect';
          rules.push({key:JSON.stringify(next),path:next,owner,name:`${owner} • ${fieldNames[key]||key.replaceAll('_',' ')}`,type,value:v,active:isActive});
        } else if(textFields.has(key)&&Array.isArray(v))v.forEach((value,i)=>{
          if(typeof value==='string'&&text(value))rules.push({key:JSON.stringify([...next,i]),path:[...next,i],owner,name:`${owner} • ${fieldNames[key]||key} ${i+1}`,type:key.startsWith('passive')?'passive':'effect',value,active:isActive});
          else visit(value,[...next,i],`${owner} • ${value?.name||i+1}`,isActive,depth+1);
        });
        else visit(v,next,`${owner}${v?.name?` • ${v.name}`:key==='core_system'?' • Core system':''}`,isActive,depth+1);
      }
    }
    visit(entry.data,entry.dataPath,entry.name,active);
    // Identical summary/description text is one displayed rule, with its real path retained.
    const seen=new Set(), unique=rules.filter(r=>{if(r.action)return true;const id=`${r.owner}:${r.type}:${text(r.value)}`;if(seen.has(id))return false;seen.add(id);return true;});
    const visible=unique.filter(r=>(includeInactive||r.active)&&(!kind||kind===r.type)&&(!activation||(r.action?.activation||'')===activation)&&(!term||text(`${entry.name} ${r.owner} ${r.name} ${r.value||''} ${JSON.stringify(r.action||{})}`).toLowerCase().includes(term)));
    const counts=Object.fromEntries(Object.keys(ruleLabels).map(t=>[t,visible.filter(r=>r.type===t).length]));
    return {key:entry.key,entry,name:entry.name,origin,active,rules:visible,counts,total:unique.length,loadout:entry.path[0]==='loadouts'?raw.loadouts?.[entry.path[1]]?.name:entry.path[2]==='loadouts'?raw.mechs[index]?.loadouts?.[entry.path[3]]?.name:''};
  }).filter(g=>(!origin||g.origin===origin) && (includeInactive||g.active) && (g.rules.length || (!kind&&!activation&&!g.total&&(!term||text(g.name).toLowerCase().includes(term))))).sort((a,b)=>Object.keys(originLabels).indexOf(a.origin)-Object.keys(originLabels).indexOf(b.origin));
}
export function sheetDiagnostics(raw) {
  const out=[], add=(name,reason,path,section='actions')=>out.push({key:JSON.stringify(path)+reason,name,reason,path,section,unitIndex:path[0]==='mechs'?path[1]:-1});
  for(const e of ruleEntries(raw)) {
    if(e.extra && /^(?:custom_)?(?:rules|abilities)$/.test(e.path.at(-1)))add(e.name,'Conteúdo adicional sem classificação automática; confira todos os campos desta origem.',e.path);
    if(!e.extra && (!e.data || typeof e.data!=='object' || !e.data.name && !e.data.description && !e.data.effect && !e.data.actions && !e.data.ranks))
      add(e.name,'Definição ausente ou incompleta; confira o LCP/origem deste item.',e.path);
    function visit(v,path,depth=0){
      if(!v||typeof v!=='object'||depth>24)return;
      for(const [k,x] of Object.entries(v)){
        if(k==='brew')continue;
        if(actionFields.has(k) && (!Array.isArray(x)||x.some(a=>!a||typeof a!=='object'||Array.isArray(a))))add(e.name,`Lista ${k} contém uma regra inválida. Os dados foram preservados.`,[...path,k]);
        if(/^(?:custom_)?(?:rules|abilities|special_effects|passives)$/.test(k)&&x!=null)add(e.name,`Campo ${k} sem classificação automática. Consulte os dados completos deste item.`,[...path,k]);
        if(!actionFields.has(k))visit(x,[...path,k],depth+1);
      }
    }
    visit(e.data,e.dataPath);
  }
  const instances=new Map();
  for(const e of entries(raw)){
    const id=e.item.instance_id || e.item._foundryUuid;
    if(!id)continue;
    const context=JSON.stringify(e.path.slice(0,e.path[0]==='mechs'?4:2))+id;
    if(instances.has(context))add(e.name,'A mesma instância aparece mais de uma vez neste loadout. Confira as montagens.',e.path);else instances.set(context,e);
  }
  for(const [i,unit] of [raw,...(raw.mechs||[])].entries()){
    const path=i?['mechs',i-1]:[];
    if(i && unit.frame && !unit.frameData)add(unit.name||'Mecha',`Referência de frame ${unit.frame} sem definição.`,[...path,'frame'],'mechs');
    if(unit.loadouts?.length){const active=i?unit.active_loadout_index:unit.active_index;if(active!=null&&(!Number.isInteger(active)||active<0||active>=unit.loadouts.length))add(unit.name||'Piloto','Loadout ativo fora da lista disponível.',[...path,i?'active_loadout_index':'active_index'],i?'mechs':'equipment');}
    try{const portrait=pilotPortrait(unit);if(portrait.startsWith('https:'))for(const warning of imageURLWarnings(portrait))add(unit.name||'Piloto',warning,[...path,'img'],i?'mechs':'pilot');if(portrait.startsWith('data:'))add(unit.name||'Piloto','Retrato incorporado sem URL pública. Use Retrato por URL antes de aplicar.',[...path,'img'],'pilot');}
    catch(error){add(unit.name||'Piloto',error.message,[...path,'img'],'pilot');}
  }
  return out;
}

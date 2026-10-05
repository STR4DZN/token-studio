// Public share protocol, researched from COMP/CON and the Lancer system.
// This API identifier is shipped publicly by Lancer; it is not an account credential.
export const PUBLIC_API_KEY = "fcFvjjrnQy2hypelJQi4X9dRI55r5KuI4bC07Maf";
export const COMP_API = "https://api.compcon.app/v3/code";
export const COMP_BUCKET = "https://ds69h3g1zxwgy.cloudfront.net/";
export const REFERENCE_LINK =
  "https://compcon.app/link/pilot/1HM40U8YCU35/full/";
const badKeys = new Set(["__proto__", "constructor", "prototype"]);
export const copy = (value) => structuredClone(value);
export function pilotPortrait(raw) {
  const source = raw?.img?.cloud_portrait || raw?.cloud_portrait || raw?.img?.portrait || raw?.portrait || '';
  if (!source) return '';
  if (typeof source !== 'string') throw new Error('O retrato do COMP/CON não contém um endereço válido.');
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(source)) return source;
  let url;
  try { url = new URL(source, 'https://compcon.app/'); } catch { throw new Error('Endereço do retrato COMP/CON inválido.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use um retrato HTTPS ou uma imagem PNG/JPG/WebP/GIF incorporada no COMP/CON.');
  return url.href;
}
export async function downloadPortrait(source, {fetcher = fetch} = {}) {
  const validated = pilotPortrait({img:{cloud_portrait:source}});
  if (!validated) throw new Error('A ficha COMP/CON não possui retrato.');
  let response;
  try { response = await fetcher(validated, {credentials:'omit', signal:AbortSignal.timeout(20000)}); }
  catch { throw new Error('Não foi possível baixar o retrato COMP/CON. Confira se a imagem está publicada e permite acesso pelo navegador.'); }
  if (!response.ok) throw new Error(`O retrato COMP/CON respondeu com erro ${response.status}.`);
  if (Number(response.headers?.get('content-length')) > 30*1024*1024) throw new Error('O retrato excede 30 MB.');
  const blob = await response.blob();
  if (!blob.size || blob.size > 30*1024*1024) throw new Error('Retrato vazio ou maior que 30 MB.');
  const data = new Uint8Array(await blob.slice(0,12).arrayBuffer());
  const ascii = new TextDecoder().decode(data);
  const type = data[0]===137 && ascii.slice(1,4)==='PNG' ? 'image/png'
    : data[0]===255 && data[1]===216 && data[2]===255 ? 'image/jpeg'
    : /^GIF8[79]a/.test(ascii) ? 'image/gif'
    : ascii.slice(0,4)==='RIFF' && ascii.slice(8,12)==='WEBP' ? 'image/webp' : '';
  if (!type) throw new Error('O endereço do retrato não devolveu uma imagem PNG/JPG/WebP/GIF válida.');
  return new Blob([blob], {type});
}
export function shareCode(input) {
  const text = String(input || "").trim();
  let code = text.replaceAll("-", "").toUpperCase();
  if (/^https?:/i.test(text)) {
    let url;
    try {
      url = new URL(text);
    } catch {
      throw new Error("Link inválido.");
    }
    if (
      url.protocol !== "https:" ||
      !["compcon.app", "www.compcon.app"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    )
      throw new Error("Use um link HTTPS de ficha em compcon.app.");
    const match = url.pathname.match(
      /^\/link\/pilot\/([a-z0-9]{12})(?:\/(?:full|build))?(?:\/[^/]+)?\/?$/i,
    );
    if (!match) throw new Error("Use um link de piloto do COMP/CON v3.");
    code = match[1].toUpperCase();
  }
  if (!/^[A-Z0-9]{12}$/.test(code))
    throw new Error(
      "Use o link do piloto ou seu código de 12 caracteres do COMP/CON v3.",
    );
  return code;
}
export function assertJSON(value) {
  let count = 0;
  function visit(v, depth) {
    if (++count > 180000 || depth > 60)
      throw new Error("Ficha grande ou profunda demais.");
    if (v === null || typeof v === "string" || typeof v === "boolean") return;
    if (typeof v === "number") {
      if (!Number.isFinite(v)) throw new Error("Número inválido.");
      return;
    }
    if (typeof v !== "object") throw new Error("Conteúdo não é JSON.");
    if (Array.isArray(v) && v.length > 10000)
      throw new Error("Lista grande demais.");
    for (const [k, x] of Object.entries(v)) {
      if (badKeys.has(k)) throw new Error("Chave não permitida.");
      visit(x, depth + 1);
    }
  }
  visit(value, 0);
  return value;
}
export function parsePilot(input) {
  if (typeof input === "string") {
    if (input.length > 12 * 1024 * 1024)
      throw new Error("Limite: 12 MB de JSON.");
    input = JSON.parse(input);
  }
  assertJSON(input);
  const raw =
    input?.schema === "token-studio-sheet-1"
      ? input.data
      : input?.EXPORT_TYPE
        ? input.data
        : input;
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    typeof raw.name !== "string" ||
    !Array.isArray(raw.mechs) ||
    !(raw.itemType === "pilot" || typeof raw.callsign === "string")
  )
    throw new Error("O arquivo não contém uma ficha de piloto do COMP/CON.");
  for (const field of [
    "skills",
    "talents",
    "licenses",
    "core_bonuses",
    "reserves",
    "orgs",
    "loadouts",
  ])
    if (raw[field] != null && !Array.isArray(raw[field]))
      throw new Error(`Campo ${field}: esperada uma lista.`);
  for (const unit of [raw, ...raw.mechs]) {
    if (!unit || typeof unit !== "object" || Array.isArray(unit))
      throw new Error("Unidade inválida.");
    if (unit.loadouts != null && !Array.isArray(unit.loadouts))
      throw new Error("Loadouts devem ser uma lista.");
    for (const l of unit.loadouts || []) {
      if (!l || typeof l !== "object" || Array.isArray(l))
        throw new Error("Loadout inválido.");
      for (const k of [
        "armor",
        "weapons",
        "gear",
        "systems",
        "integratedSystems",
        "mounts",
        "integratedMounts",
      ])
        if (l[k] != null && !Array.isArray(l[k]))
          throw new Error(`Loadout: ${k} deve ser uma lista.`);
    }
  }
  if (raw.mechs.length > 100)
    throw new Error("Mais de 100 mechas na mesma ficha.");
  return copy(raw);
}
async function fetchJSON(url, options = {}, fetcher = fetch) {
  const response = await fetcher(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(20000),
    credentials: "omit",
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 429)
      throw new Error(
        "O COMP/CON limitou as consultas. Aguarde antes de tentar novamente.",
      );
    if ([403, 404].includes(response.status))
      throw new Error(
        "Código não disponível. Confira se o piloto está sincronizado e compartilhado no COMP/CON.",
      );
    throw new Error(`O COMP/CON respondeu com erro ${response.status}.`);
  }
  const text = await response.text();
  if (text.length > 12 * 1024 * 1024)
    throw new Error("Resposta maior que 12 MB.");
  return JSON.parse(text);
}
export async function downloadPilot(input, { fetcher = fetch, signal } = {}) {
  const code = shareCode(input);
  try {
    const url = new URL(COMP_API);
    url.searchParams.set("codes", JSON.stringify([code]));
    url.searchParams.set("scope", "items");
    const lookup = await fetchJSON(
      url.toString(),
      { headers: { "x-api-key": PUBLIC_API_KEY }, signal },
      fetcher,
    );
    const entry = Array.isArray(lookup)
      ? lookup.find((x) => x.code === code) || lookup[0]
      : lookup;
    if (!entry?.uri) throw new Error("Compartilhamento não encontrado.");
    const content = new URL(entry.uri, COMP_BUCKET);
    if (content.origin !== new URL(COMP_BUCKET).origin)
      throw new Error("A origem devolvida pelo COMP/CON não é reconhecida.");
    const data = parsePilot(
      await fetchJSON(content.toString(), { signal }, fetcher),
    );
    return {
      data,
      code,
      url: `https://compcon.app/link/pilot/${code}/full/`,
      remoteUpdated: entry.item_modified || entry.updated || null,
    };
  } catch (e) {
    if (e instanceof TypeError || e.name === "TimeoutError")
      throw new Error(
        "Não foi possível consultar o COMP/CON (rede, CORS ou tempo esgotado). Importe o JSON exportado ou use o resolvedor incluído no pacote.",
      );
    throw e;
  }
}
export function sourceMetadata(source = {}) {
  return Object.fromEntries(
    [
      "code",
      "url",
      "remoteUpdated",
      "filename",
      "kind",
      "actorUuid",
      "importedAt",
    ]
      .filter((k) => source[k] != null)
      .map((k) => [k, source[k]]),
  );
}
export function createSheet(raw, source = {}) {
  const data = parsePilot(raw);
  return {
    schema: "token-studio-sheet-1",
    data,
    base: copy(data),
    source: { ...sourceMetadata(source), importedAt: Date.now() },
    tracking: { round: 1, uses: {} },
    updatedAt: Date.now(),
  };
}
export function validateSheet(sheet) {
  if (sheet?.schema !== "token-studio-sheet-1")
    throw new Error("Projeto de ficha não reconhecido.");
  assertJSON(sheet);
  parsePilot(sheet.data);
  parsePilot(sheet.base);
  if (
    !sheet.source ||
    typeof sheet.source !== "object" ||
    Array.isArray(sheet.source) ||
    !Number.isFinite(sheet.source.importedAt) ||
    !Number.isFinite(sheet.updatedAt)
  )
    throw new Error("Origem ou data do projeto inválida.");
  for (const key of ["code", "url", "filename", "kind", "actorUuid"])
    if (sheet.source[key] != null && typeof sheet.source[key] !== "string")
      throw new Error("Metadados de origem inválidos.");
  const tracking = sheet.tracking;
  if (
    !tracking ||
    !Number.isInteger(tracking.round) ||
    tracking.round < 1 ||
    !tracking.uses ||
    typeof tracking.uses !== "object" ||
    Array.isArray(tracking.uses) ||
    Object.values(tracking.uses).some((v) => !Number.isInteger(v) || v < 0)
  )
    throw new Error("Contadores do projeto inválidos.");
  const result = copy(sheet);
  result.source = sourceMetadata(sheet.source);
  return result;
}
export function getPath(obj, path) {
  return path.reduce((v, k) => v?.[k], obj);
}
export function setPath(obj, path, value) {
  if (!path.length || path.some((k) => badKeys.has(String(k))))
    throw new Error("Campo inválido.");
  let at = obj;
  for (const k of path.slice(0, -1)) {
    if (at[k] === undefined) at[k] = {};
    at = at[k];
    if (!at || typeof at !== "object") throw new Error("Caminho inválido.");
  }
  if (value === undefined) delete at[path.at(-1)];
  else at[path.at(-1)] = copy(value);
  return obj;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export function diffData(before, after) {
  const changes = [];
  function visit(a, b, path) {
    if (same(a, b)) return;
    // Keep type changes and arrays atomic, so selecting a row never creates an invalid ancestor.
    if (
      object(a) &&
      object(b) &&
      Object.keys(a).length &&
      Object.keys(b).length
    ) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)]))
        visit(a[key], b[key], [...path, key]);
    } else
      changes.push({ key: JSON.stringify(path), path, before: a, after: b });
  }
  visit(before, after, []);
  return changes;
}
export function mergePlan(base, local, incoming) {
  return diffData(local, incoming).map((change) => ({
    ...change,
    base: getPath(base, change.path),
    conflict:
      !same(getPath(base, change.path), change.before) &&
      !same(getPath(base, change.path), change.after),
    selected: same(getPath(base, change.path), change.before),
  }));
}
export function applyMerge(local, changes, selected) {
  const next = copy(local);
  for (const c of changes)
    if (selected.has(c.key)) setPath(next, c.path, c.after);
  return next;
}
export function entries(raw) {
  const result = [];
  const add = (list, path, kind) => {
    for (const [i, item] of (list || []).entries())
      if (item) {
        const data = item.data || item;
        result.push({
          key: JSON.stringify([...path, i]),
          path: [...path, i],
          dataPath: item.data ? [...path, i, "data"] : [...path, i],
          item,
          data,
          kind,
          name: data.name || item.name || item.id || kind,
        });
      }
  };
  for (const key of [
    "skills",
    "talents",
    "licenses",
    "core_bonuses",
    "reserves",
    "orgs",
  ])
    add(raw[key], [key], key);
  for (const [i, l] of (raw.loadouts || []).entries())
    for (const k of ["armor", "weapons", "gear"])
      add(l[k], ["loadouts", i, k], k);
  for (const [i, m] of (raw.mechs || []).entries()) {
    if (m.frameData)
      result.push({
        key: `frame-${i}`,
        path: ["mechs", i, "frameData"],
        dataPath: ["mechs", i, "frameData"],
        item: m.frameData,
        data: m.frameData,
        kind: "frame",
        name: m.frameData.name || m.frame,
      });
    for (const [j, l] of (m.loadouts || []).entries()) {
      for (const k of ["systems", "integratedSystems"])
        add(l[k], ["mechs", i, "loadouts", j, k], "systems");
      const mounts = [
        ...(l.mounts || []),
        ...[
          l.improved_armament,
          l.integratedWeapon,
          l.superheavy_mounting,
        ].filter(Boolean),
      ];
      // Path lookup includes extra mounts so edits retain their actual location.
      for (const [k, mount] of mounts.entries()) {
        const p =
          k < (l.mounts || []).length
            ? ["mechs", i, "loadouts", j, "mounts", k]
            : [
                "mechs",
                i,
                "loadouts",
                j,
                Object.keys(l).find((x) => l[x] === mount),
              ];
        for (const sub of ["slots", "extra"])
          for (const [n, slot] of (mount[sub] || []).entries())
            if (slot?.weapon) add([slot.weapon], [...p, sub, n], "_slot");
      }
      for (const [k, slot] of (l.integratedMounts || []).entries())
        if (slot?.weapon) {
          const item = slot.weapon;
          result.push({
            key: `integrated-${i}-${j}-${k}`,
            path: ["mechs", i, "loadouts", j, "integratedMounts", k, "weapon"],
            dataPath: [
              "mechs",
              i,
              "loadouts",
              j,
              "integratedMounts",
              k,
              "weapon",
              ...(item.data ? ["data"] : []),
            ],
            item,
            data: item.data || item,
            kind: "mech_weapons",
            name: (item.data || item).name || item.id,
          });
        }
    }
  }
  // Slots are objects, not arrays; repair their normalized editing path.
  for (const e of result)
    if (e.kind === "_slot") {
      e.path = [...e.path.slice(0, -1), "weapon"];
      e.dataPath = [...e.path, ...(e.item.data ? ["data"] : [])];
      e.key = JSON.stringify(e.path);
      e.kind = "mech_weapons";
    }
  for (const e of [...result])
    if (e.kind === "mech_weapons" && e.item.mod) {
      const item = e.item.mod,
        path = [...e.path, "mod"];
      result.push({
        key: JSON.stringify(path),
        path,
        dataPath: [...path, ...(item.data ? ["data"] : [])],
        item,
        data: item.data || item,
        kind: "weapon_mods",
        name: (item.data || item).name || item.id,
      });
    }
  return result;
}
// Rule origins include extra unit-level content without treating it as native equipment.
export function ruleEntries(raw) {
  const result=entries(raw);
  const names={bond:'Bond',bondData:'Bond',actions:'Ações da unidade',active_actions:'Ações da unidade',passive_actions:'Passivas da unidade',traits:'Traits da unidade',core_system:'Core system',rules:'Regras adicionais',abilities:'Habilidades adicionais',custom_rules:'Regras personalizadas',custom_abilities:'Habilidades personalizadas',features:'Features'};
  for(const [index,unit] of [raw,...(raw.mechs||[])].entries())for(const [key,name] of Object.entries(names)) {
    const value=unit[key];if(value==null || typeof value!=='object' && typeof value!=='string' || key==='bond' && unit.bondData)continue;
    const root=index?['mechs',index-1]:[], path=[...root,key], wrapped=Array.isArray(value)||typeof value==='string';
    result.push({key:JSON.stringify(path),path,dataPath:wrapped?root:path,item:value,data:wrapped?{[key]:value}:value,kind:'other',name,extra:true});
  }
  return result;
}
export function allActions(raw) {
  const out = [];
  const visit = (obj, path, owner, active = true, rank = 3) => {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => visit(v, [...path, i], owner, active, rank));
      return;
    }
    for (const [k, v] of Object.entries(obj)) {
      if (
        ["actions", "active_actions", "passive_actions"].includes(k) &&
        Array.isArray(v)
      ) {
        for (const [i, a] of v.entries()) {
          if (!a || typeof a !== 'object' || Array.isArray(a)) continue;
          out.push({
            key: JSON.stringify([...path, k, i]),
            path: [...path, k, i],
            owner,
            name: a.name || "Ação",
            action: a,
            active,
          });
        }
      } else if (k === "ranks" && Array.isArray(v)) {
        v.forEach((r, i) =>
          visit(
            r,
            [...path, k, i],
            `${owner} • ${r.name || `Rank ${i + 1}`}`,
            active && i < rank,
            rank,
          ),
        );
      } else if (k !== "brew") visit(v, [...path, k], owner, active, rank);
    }
  };
  // Enumerate definitions once, avoiding wrapper duplication.
  for (const e of ruleEntries(raw)) {
    const isActive =
      e.path[0] === "loadouts"
        ? e.path[1] === (raw.active_index || 0)
        : e.path[0] === "mechs" && e.path[2] === "loadouts"
          ? e.path[3] === (raw.mechs[e.path[1]].active_loadout_index || 0)
          : true;
    visit(e.data, e.dataPath, e.name, isActive, e.item.rank ?? 3);
  }
  return out;
}
export function frequencyLimit(frequency) {
  const match = String(frequency || "")
    .trim()
    .match(/^(\d+)\s*\/\s*(round|scene|mission)$/i);
  return match
    ? { limit: Number(match[1]), period: match[2].toLowerCase() }
    : null;
}
export const resourceNames = {
  hp: "Vida",
  overshield: "Overshield",
  heat: "Calor",
  heatcap: "Capacidade de calor",
  structure: "Estrutura",
  stress: "Stress",
  repairCapacity: "Reparos",
  burn: "Burn",
  overcharge: "Overcharge",
  activations: "Ativações",
  armor: "Armadura",
  speed: "Velocidade",
  evasion: "Evasão",
  edef: "E-Defense",
  sensorRange: "Sensores",
  saveTarget: "Save Target",
  grit: "Grit",
  limitedBonus: "Bônus de Limited",
  size: "Tamanho",
  techAttack: "Tech Attack",
  sp: "SP",
};
export function applyResolvedDamage(sheet, path, amount, heal = false) {
  if (!Number.isInteger(amount) || amount < 0 || amount > 100000)
    throw new Error("Informe um valor inteiro de 0 a 100000.");
  const next = copy(sheet),
    unit = getPath(next.data, path),
    stats = unit.stats || {},
    cur = stats.current || {},
    max = stats.max || {};
  const hp = Number(cur.hp);
  if (!Number.isFinite(hp)) throw new Error("Vida atual não disponível.");
  let shield = Math.max(0, Number(cur.overshield) || 0);
  if (heal)
    cur.hp = Math.min(Number.isFinite(max.hp) ? max.hp : Infinity, hp + amount);
  else {
    const absorbed = Math.min(shield, amount);
    cur.overshield = shield - absorbed;
    cur.hp = Math.max(0, hp - (amount - absorbed));
  }
  unit.stats = { ...stats, current: cur };
  next.updatedAt = Date.now();
  return next;
}

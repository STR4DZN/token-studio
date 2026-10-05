import { copy, parsePilot, entries, validateSheet, pilotPortrait, shareCode } from "./compcon.js";
import { isDefaultImage, syncPortraitProject } from './actor-images.js';
const ID = "token-studio";
const kinds = {
  skills: "skill",
  talents: "talent",
  licenses: "license",
  core_bonuses: "core_bonus",
  reserves: "reserve",
  orgs: "organization",
  armor: "pilot_armor",
  weapons: "pilot_weapon",
  gear: "pilot_gear",
  frame: "frame",
  systems: "mech_system",
  mech_weapons: "mech_weapon",
  weapon_mods: "weapon_mod",
};
const flagKey = (item) => item.flags?.[ID]?.sheetKey;
const snapshot = (actor) => copy(actor.toObject());
const currentItems = (actor) =>
  actor.items?.contents || Array.from(actor.items?.values?.() || []);
const text = (value) => (value == null ? "" : String(value));
const list = (value) => (Array.isArray(value) ? value : []);
const cleanObject = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
const allowedTags = new Set([
  "P",
  "BR",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "H3",
  "H4",
  "TABLE",
  "TBODY",
  "TR",
  "TD",
  "TH",
]);
function html(value) {
  const source = text(value);
  if (typeof document === "undefined")
    return source
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const template = document.createElement("template");
  template.innerHTML = source;
  const output = document.createElement("div");
  function append(node, to) {
    if (node.nodeType === 3) {
      to.append(document.createTextNode(node.textContent));
      return;
    }
    if (node.nodeType !== 1) return;
    if (
      ["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH"].includes(
        node.tagName,
      )
    )
      return;
    const target = allowedTags.has(node.tagName)
      ? document.createElement(node.tagName.toLowerCase())
      : to;
    if (target !== to) to.append(target);
    for (const child of node.childNodes) append(child, target);
  }
  for (const child of template.content.childNodes) append(child, output);
  return output.innerHTML;
}
function checklist(values, names) {
  if (values == null) return null;
  if (!Array.isArray(values)) return copy(values);
  return Object.fromEntries(
    names.map((n) => [n, !values.length || values.includes(n)]),
  );
}
function bonus(b) {
  return {
    lid: b.id || b.lid || "",
    val: text(b.val),
    replace: !!b.replace,
    overwrite: !!b.overwrite,
    damage_types: checklist(b.damage_types, [
      "Burn",
      "Energy",
      "Explosive",
      "Heat",
      "Kinetic",
      "Variable",
    ]),
    range_types: checklist(b.range_types, [
      "Blast",
      "Burst",
      "Cone",
      "Line",
      "Range",
      "Thrown",
      "Threat",
    ]),
    weapon_types: checklist(b.weapon_types, [
      "Rifle",
      "Launcher",
      "Cannon",
      "CQB",
      "Melee",
      "Nexus",
    ]),
    weapon_sizes: checklist(b.weapon_sizes, [
      "Auxiliary",
      "Main",
      "Heavy",
      "Superheavy",
    ]),
  };
}
function counter(c) {
  return {
    lid: c.id || c.lid || "",
    name: c.name || "",
    min: c.min ?? 0,
    max: c.max ?? null,
    value: c.value ?? c.val ?? c.default_value ?? 0,
    default_value: c.default_value ?? c.min ?? 0,
  };
}
function action(a) {
  const activation =
    { "full action": "Full", "quick action": "Quick", "free action": "Free" }[
      text(a.activation).toLowerCase()
    ] ||
    a.activation ||
    "Quick";
  const frequency = a.frequency || null;
  return cleanObject({
    ...a,
    lid: a.id || a.lid || "",
    activation,
    frequency,
    detail: html(a.detail),
    trigger: html(a.trigger),
    init: html(a.init),
    terse: html(a.terse),
    damage: list(a.damage).map((d) => ({ ...d, val: text(d.val) })),
    range: list(a.range),
    cost: a.cost ?? 0,
    heat_cost: a.heat_cost ?? 0,
    mech: a.mech ?? true,
    pilot: a.pilot ?? false,
    synergy_locations: list(a.synergy_locations),
  });
}
function bits(d) {
  return {
    actions: list(d.actions).map(action),
    bonuses: list(d.bonuses).map(bonus),
    counters: list(d.counters).map(counter),
    tags: list(d.tags).map((t) => ({
      lid: t.id || t.lid || "",
      val: text(t.val ?? 0),
    })),
    synergies: list(d.synergies).map((s) => ({
      ...s,
      locations: list(s.locations),
    })),
    deployables: list(d.deployables)
      .map((x) => (typeof x === "string" ? x : x.id))
      .filter(Boolean),
    integrated: list(d.integrated)
      .map((x) => (typeof x === "string" ? x : x.id))
      .filter(Boolean),
  };
}
function mapProfile(d) {
  return cleanObject({
    ...d,
    ...bits(d),
    damage: list(d.damage).map((x) => ({ ...x, val: text(x.val) })),
    range: list(d.range),
    description: html(d.description),
    effect: html(d.effect),
    on_attack: html(d.on_attack),
    on_hit: html(d.on_hit),
    on_crit: html(d.on_crit),
    type: d.type || "Rifle",
    skirmishable: d.skirmishable ?? true,
    barrageable: d.barrageable ?? true,
    cost: d.cost ?? 0,
  });
}
export function toNativeItem(entry) {
  const d = entry.data,
    state = entry.item,
    type = kinds[entry.kind];
  if (!type) throw new Error(`Tipo não reconhecido: ${entry.kind}`);
  let system = {
    lid: d.id || state.id || `ts_${entry.kind}`,
    description: html(d.description),
    effect: html(d.effect),
    ...bits(d),
  };
  if (["skill", "talent", "license"].includes(type))
    system.curr_rank = state.rank ?? 1;
  if (type === "skill") {
    system = {
      lid: system.lid,
      description: html(d.description),
      detail: text(d.detail),
      curr_rank: system.curr_rank,
    };
  }
  if (type === "talent") {
    system.ranks = list(d.ranks).map((r) =>
      cleanObject({ ...r, ...bits(r), description: html(r.description) }),
    );
    system.terse = d.terse || "";
  }
  if (type === "license")
    system = {
      lid: d.id || state.id || `lic_${d.key}`,
      key: d.key || d.license || d.id || "",
      manufacturer: d.manufacturer || d.source || "GMS",
      curr_rank: state.rank ?? 1,
    };
  if (type === "core_bonus") {
    system.manufacturer = d.source || d.manufacturer || "GMS";
    system.mounted_effect = html(d.mounted_effect);
  }
  if (
    [
      "pilot_armor",
      "pilot_weapon",
      "pilot_gear",
      "mech_system",
      "mech_weapon",
    ].includes(type)
  ) {
    system.uses = { value: state.currentUses ?? state.uses ?? 0 };
    system.destroyed = !!state.destroyed;
    system.cascading = !!state.cascading;
  }
  if (type === "pilot_weapon") {
    system.damage = list(d.damage).map((x) => ({ ...x, val: text(x.val) }));
    system.range = list(d.range);
    system.loaded = state.loaded ?? true;
  }
  if (type === "reserve") {
    system.type = d.type || "Tactical";
    system.label = d.label || d.name;
    system.resource_name = d.resource_name || "";
    system.resource_cost = d.resource_cost || 0;
  }
  if (type === "organization") {
    system = { ...d, ...system };
  }
  if (["frame", "mech_system", "mech_weapon", "weapon_mod"].includes(type)) {
    system.manufacturer = d.source || d.manufacturer || "GMS";
    system.license = d.license || "mf_unknown";
    system.license_level = d.license_level || 0;
  }
  if (type === "weapon_mod") {
    system.sp = d.sp || 0;
    system.added_tags = list(d.added_tags).map((t) => ({
      lid: t.id || t.lid,
      val: text(t.val ?? 0),
    }));
    system.added_range = list(d.added_range);
    system.added_damage = list(d.added_damage).map((x) => ({
      ...x,
      val: text(x.val),
    }));
    system.allowed_types = checklist(d.allowed_types, [
      "Rifle",
      "Launcher",
      "Cannon",
      "CQB",
      "Melee",
      "Nexus",
    ]);
    system.allowed_sizes = checklist(d.allowed_sizes, [
      "Auxiliary",
      "Main",
      "Heavy",
      "Superheavy",
    ]);
    system.destroyed = !!state.destroyed;
    system.cascading = !!state.cascading;
    system.uses = { value: state.currentUses ?? state.uses ?? 0 };
  }
  if (type === "mech_system") {
    Object.assign(system, {
      sp: d.sp || 0,
      type: d.type || "",
      ammo: list(d.ammo),
    });
  }
  if (type === "mech_weapon") {
    system = {
      lid: system.lid,
      manufacturer: system.manufacturer,
      license: system.license,
      license_level: system.license_level,
      sp: d.sp || 0,
      size: d.mount || d.size || "Main",
      profiles: (d.profiles?.length ? d.profiles : [d]).map(mapProfile),
      actions: list(d.actions).map(action),
      selected_profile_index: state.selected_profile_index || 0,
      loaded: state.loaded ?? true,
      destroyed: !!state.destroyed,
      cascading: !!state.cascading,
      uses: system.uses,
      deployables: system.deployables,
      integrated: system.integrated,
      no_attack: !!d.no_attack,
      no_bonuses: !!d.no_bonuses,
      no_core_bonuses: !!d.no_core_bonuses,
      no_mods: !!d.no_mods,
      no_synergies: !!d.no_synergies,
    };
  }
  if (type === "frame") {
    const s = d.stats || {};
    system.stats = {
      ...s,
      heatcap: s.heatcap ?? s.heat ?? 6,
      repcap: s.repcap ?? s.repaircap ?? s.repairCapacity ?? 0,
      save: s.save ?? s.saveTarget ?? 10,
      sensor_range: s.sensor_range ?? s.sensorRange ?? 10,
      tech_attack: s.tech_attack ?? s.techAttack ?? 0,
    };
    system.mechtype = list(d.mechtype);
    system.mounts = list(d.mounts);
    system.traits = list(d.traits).map((t) => ({
      ...t,
      ...bits(t),
      description: html(t.description),
    }));
    const c = d.core_system || {};
    system.core_system = {
      ...c,
      activation: c.activation || "Free",
      deactivation: c.deactivation || null,
      ...bits(c),
      active_actions: list(c.active_actions).map(action),
      passive_actions: list(c.passive_actions).map(action),
      active_bonuses: list(c.active_bonuses).map(bonus),
      passive_bonuses: list(c.passive_bonuses).map(bonus),
    };
  }
  const stable = `${type}:${state.instanceId || state.id || d.id || entry.key}`;
  return {
    name: state.flavorName || d.name || state.id || type,
    type,
    system: cleanObject(system),
    flags: { [ID]: { sheetKey: stable, packed: copy(state) } },
  };
}
const normalizedItemKey = (e, native) => native.flags[ID].sheetKey;
function managedInfo(item) {
  return (
    item.getFlag?.(ID, "sheetKey") ||
    flagKey(item.toObject ? item.toObject() : item)
  );
}
function actorPatch(raw, parts, type = "pilot") {
  const patch = {};
  const stats = raw.stats?.current || {},
    max = raw.stats?.max || {};
  if (parts.identity) {
    patch['prototypeToken.name'] = raw.name;
    patch['prototypeToken.actorLink'] = true;
    patch.name = raw.name;
    for (const field of type === "pilot"
      ? [
          "callsign",
          "player_name",
          "background",
          "history",
          "notes",
          "status",
          "text_appearance",
        ]
      : ["notes"])
      if (raw[field] != null)
        patch[`system.${field}`] =
          typeof raw[field] === "string" ? html(raw[field]) : raw[field];
  }
  if (parts.build && type === "pilot") {
    patch["system.level"] = raw.level ?? 0;
    for (const [k, i] of [
      ["hull", 0],
      ["agi", 1],
      ["sys", 2],
      ["eng", 3],
    ])
      patch[`system.${k}`] = raw.mechSkills?.[i] ?? 0;
  }
  if (parts.combat) {
    for (const k of [
      "hp",
      "overshield",
      ...(type === "mech" ? ["heat", "structure", "stress"] : []),
    ])
      if (stats[k] != null) patch[`system.${k}.value`] = stats[k];
    for (const k of [
      "burn",
      "activations",
      ...(type === "mech" ? ["overcharge"] : []),
    ])
      if (stats[k] != null) patch[`system.${k}`] = stats[k];
    if (type === "mech") {
      if (stats.repairCapacity != null)
        patch["system.repairs.value"] = stats.repairCapacity;
      if (raw.corePower != null) patch["system.core_energy"] = raw.corePower;
      if (raw.coreActive != null)
        patch["system.core_active"] = !!raw.coreActive;
    }
  }
  if (parts.build && raw.bond && type === "pilot") {
    const b = raw.bond;
    for (const [k, v] of Object.entries({
      xp: { value: b.xp || 0 },
      stress: { value: b.stress || 0 },
      answers: b.bondAnswers || [],
      minor_ideal: b.minorIdeal || "",
      clocks: list(b.clocks).map((c) =>
        counter({
          id: c.id,
          name: c.title,
          min: 0,
          max: c.segments,
          value: c.progress,
        }),
      ),
      burdens: list(b.burdens).map((c) =>
        counter({
          id: c.id,
          name: c.title,
          min: 0,
          max: c.segments,
          value: c.progress,
        }),
      ),
    }))
      patch[`system.bond_state.${k}`] = v;
  }
  return patch;
}
const pathValue = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
function itemPlan(actor, sourceEntries, parts, warnings, changes) {
  const operations = [],
    existing = currentItems(actor),
    used = new Set();
  for (const e of sourceEntries) {
    const native = toNativeItem(e),
      key = normalizedItemKey(e, native);
    const repeated = operations.find((o) => o.key === key);
    if (repeated) {
      if (
        JSON.stringify(repeated.data.system) !== JSON.stringify(native.system)
      )
        warnings.push(
          `${native.name}: uma mesma instância tem estados diferentes entre loadouts; o primeiro estado será usado no Foundry.`,
        );
      repeated.aliasPaths ||= [];
      repeated.aliasPaths.push(e.path);
      continue;
    }
    let item = existing.find((x) => managedInfo(x) === key);
    if (!item) {
      const external = existing.find(
        (x) =>
          x.type === native.type &&
          x.system?.lid === native.system.lid &&
          !managedInfo(x),
      );
      if (external) {
        if (!parts.adopt) {
          warnings.push(
            `${actor.name}: ${native.name} já existe fora do Token Studio. Marque a adoção de itens para atualizá-lo sem criar duplicata.`,
          );
          operations.push({ blocked: true });
          continue;
        }
        item = external;
        warnings.push(
          `${actor.name}: ${native.name} será adotado pelo Token Studio; o estado anterior será salvo no backup.`,
        );
      }
    }
    if (item && used.has(item.id)) {
      warnings.push(
        `${native.name}: o mesmo ID aparece mais de uma vez. Verifique as instâncias e loadouts.`,
      );
      continue;
    }
    if (item) {
      used.add(item.id);
      native._id = item.id;
      const before = item.toObject();
      operations.push({
        kind: "update",
        id: item.id,
        data: native,
        key,
        sourcePath: e.path,
      });
      if (
        JSON.stringify(before.system) !== JSON.stringify(native.system) ||
        before.name !== native.name
      )
        changes.push({
          document: `${actor.name} • ${native.name}`,
          field: "Item • atualizar",
          before: { name: before.name, system: before.system },
          after: { name: native.name, system: native.system },
        });
    } else {
      operations.push({
        kind: "create",
        data: native,
        key,
        sourcePath: e.path,
      });
      changes.push({
        document: `${actor.name} • ${native.name}`,
        field: "Item • criar",
        after: { name: native.name, type: native.type, system: native.system },
      });
    }
    if (list(e.data.deployables).some((x) => typeof x === "object"))
      warnings.push(
        `${native.name}: definições de deployables são preservadas; esta integração não cria automaticamente atores de deployable.`,
      );
  }
  for (const item of existing)
    if (
      managedInfo(item) &&
      !used.has(item.id) &&
      !operations.some((o) => o.key === managedInfo(item))
    ) {
      if (parts.removeManaged) {
        operations.push({
          kind: "delete",
          id: item.id,
          before: item.toObject(),
        });
        changes.push({
          document: `${actor.name} • ${item.name}`,
          field: "Item gerenciado • remover",
          before: item.toObject(),
        });
      } else
        warnings.push(
          `${item.name}: item gerenciado ausente na nova build; permanece no Foundry porque a remoção não foi selecionada.`,
        );
    }
  return operations;
}
function summarizePatch(actor, patch, changes) {
  const source = actor.toObject();
  for (const [k, v] of Object.entries(patch))
    if (JSON.stringify(pathValue(source, k)) !== JSON.stringify(v))
      changes.push({
        document: actor.name,
        field: k,
        before: pathValue(source, k),
        after: v,
      });
}
function permission(actor, game) {
  if (!game.user?.isGM)
    throw new Error("A edição de ficha é exclusiva do mestre.");
  if (!actor?.canUserModify(game.user, "update"))
    throw new Error("Sem permissão para atualizar o personagem.");
  if (game.system?.id !== "lancer")
    throw new Error("A aplicação da ficha exige o sistema Lancer.");
  if (actor.type !== "pilot")
    throw new Error(
      "Abra o painel em um ator do tipo piloto para importar a ficha COMP/CON.",
    );
}
export async function prepareSheetPlan({
  actor,
  sheet,
  parts,
  game,
  validateItem,
}) {
  permission(actor, game);
  validateSheet(sheet);
  const raw = parsePilot(sheet.data),
    warnings = [],
    changes = [],
    documents = [];
  const pilotEntries = entries(raw).filter((e) => e.path[0] !== "mechs");
  const patch = actorPatch(raw, parts);
  function addPortrait(target, data, patch) {
    if (!parts.portrait) return;
    const portrait = pilotPortrait(data);
    if (!portrait) { warnings.push(`${data.name}: a ficha não contém retrato publicado; a imagem atual será preservada.`); return; }
    patch.img = portrait;
    if (isDefaultImage(target?.prototypeToken?.texture?.src)) patch['prototypeToken.texture.src'] = portrait;
    const project = target?.getFlag?.(ID, 'project');
    if (project?.views) patch[`flags.${ID}.project`] = syncPortraitProject(project, portrait);
  }
  addPortrait(actor, raw, patch);
  const items = parts.build
    ? itemPlan(actor, pilotEntries, parts, warnings, changes)
    : [];
  let code = sheet.source?.code || raw.cloudID || '';
  if (code) {
    try { code = shareCode(code); } catch { if (sheet.source?.code) throw new Error('Código de compartilhamento COMP/CON inválido.'); code = ''; }
  }
  if (parts.identity) {
    patch['system.cloud_id'] = code;
    if (code) patch['system.last_cloud_update'] = new Date().toISOString();
    patch[`flags.${ID}.compconLink`] = {actorUuid:actor.uuid, pilotId:raw.id, code, url:code ? `https://compcon.app/link/pilot/${code}/full/` : '', importedAt:Date.now()};
  }
  const pilot = {
    actor,
    uuid: actor.uuid,
    type: "pilot",
    raw,
    patch,
    items,
    before: snapshot(actor),
    created: false,
  };
  documents.push(pilot);
  if (parts.build) {
    const l = raw.loadouts?.[raw.active_index || 0];
    if (l) {
      changes.push({
        document: actor.name,
        field: "Loadout ativo",
        before: actor.system?.loadout,
        after: l,
      });
    }
    warnings.push(
      "O Lancer recalcula estatísticas derivadas. Os valores máximos/defesas da cópia não são escritos diretamente por cima do cálculo.",
    );
  }
  if (parts.combat && raw.conditions?.length)
    warnings.push(
      "Condições da cópia são preservadas no projeto. Não substituem automaticamente ActiveEffects do Lancer.",
    );
  summarizePatch(actor, patch, changes);
  if (parts.mechs) {
    for (const [index, mech] of raw.mechs.entries()) {
      const existing = (game.actors?.contents || []).find(
        (a) =>
          a.type === "mech" &&
          a.system?.lid === mech.id &&
          (a.system?.pilot === actor.uuid ||
            a.system?.pilot?.uuid === actor.uuid ||
            a.system?.pilot?.value?.uuid === actor.uuid ||
            a.getFlag?.(ID, "sheetPilot") === actor.uuid),
      );
      if (existing && !existing.canUserModify(game.user, "update"))
        throw new Error(`Sem permissão para o mecha ${existing.name}.`);
      const target = existing || {
        name: mech.name,
        type: "mech",
        uuid: null,
        items: { contents: [] },
        system: {},
        toObject: () => ({ name: mech.name, type: "mech", system: {} }),
      };
      const mechPatch = {
        ...actorPatch(mech, parts, "mech"),
        "system.lid": mech.id,
        "system.pilot": actor.uuid,
      };
      addPortrait(existing, mech, mechPatch);
      if (!mech.id)
        throw new Error(
          "Mecha sem ID: revise os dados completos antes de aplicar.",
        );
      if (!existing && !parts.build)
        throw new Error("Para criar um mecha novo, selecione também Build.");
      const selected = mech.active_loadout_index || 0;
      const es = entries(raw).filter(
        (e) =>
          e.path[0] === "mechs" &&
          e.path[1] === index &&
          (e.kind === "frame" || e.path[3] === selected),
      );
      const ops = parts.build
        ? itemPlan(target, es, parts, warnings, changes)
        : [];
      documents.push({
        actor: existing || null,
        uuid: existing?.uuid || null,
        type: "mech",
        raw: mech,
        rawIndex: index,
        patch: mechPatch,
        items: ops,
        before: existing ? snapshot(existing) : null,
        created: !existing,
      });
      if (!existing)
        changes.push({
          document: mech.name,
          field: "Mecha • criar",
          after: { name: mech.name, type: "mech" },
        });
      else summarizePatch(existing, mechPatch, changes);
    }
  }
  if (validateItem)
    for (const doc of documents)
      for (const op of doc.items)
        if (op.data)
          try {
            await validateItem(op.data, doc.actor);
          } catch (e) {
            op.blocked = true;
            warnings.push(
              `${op.data.name}: o schema do Lancer recusou o conteúdo (${e.message}). Nenhuma alteração será aplicada.`,
            );
          }
  return {
    summary: `${raw.name} • ${documents.length} documento(s) • ${changes.length} alteração(ões) para revisar`,
    warnings: [...new Set(warnings)],
    changes,
    blocked: documents.some((d) => d.items.some((i) => i.blocked)),
    documents,
    parts: copy(parts),
    preparedAt: Date.now(),
    sheetFingerprint: JSON.stringify(sheet.data),
    sourceFingerprint: JSON.stringify(sheet.source),
  };
}
function refsFor(doc, created) {
  const refs = new Map();
  for (const op of doc.items) {
    if (op.kind === "delete" || op.blocked) continue;
    const id = op.id || created.find((x) => managedInfo(x) === op.key)?.id;
    if (id)
      for (const p of [op.sourcePath, ...(op.aliasPaths || [])])
        refs.set(JSON.stringify(p), id);
  }
  return refs;
}
function loadoutPatch(doc, refs) {
  const r = doc.raw;
  if (doc.type === "pilot") {
    const i = r.active_index || 0;
    const l = r.loadouts?.[i];
    if (!l) return {};
    const result = {};
    for (const k of ["armor", "weapons", "gear"])
      result[`system.loadout.${k}`] = list(l[k])
        .map((_, n) => refs.get(JSON.stringify(["loadouts", i, k, n])))
        .filter(Boolean);
    return result;
  }
  const i = r.active_loadout_index || 0,
    l = r.loadouts?.[i];
  if (!l) return {};
  const offset = ["mechs", doc.rawIndex ?? 0];
  const prefix = [...offset, "loadouts", i];
  const frameKey = JSON.stringify([...offset, "frameData"]);
  const mountData = [
    ...list(l.mounts).map((m, j) => ({ m, path: [...prefix, "mounts", j] })),
    ...["improved_armament", "integratedWeapon", "superheavy_mounting"]
      .filter((k) => l[k]?.slots?.some((s) => s?.weapon))
      .map((k) => ({ m: l[k], path: [...prefix, k] })),
  ];
  const weapon_mounts = mountData.map(({ m, path }) => ({
    type: m.mount_type || m.type || "Main",
    bracing: !!m.lock,
    slots: ["slots", "extra"].flatMap((sub) =>
      list(m[sub]).map((s, k) => ({
        weapon: refs.get(JSON.stringify([...path, sub, k, "weapon"])) || null,
        mod:
          refs.get(JSON.stringify([...path, sub, k, "weapon", "mod"])) || null,
        size: s.size || "Main",
      })),
    ),
  }));
  for (const [k, s] of list(l.integratedMounts).entries())
    if (s.weapon)
      weapon_mounts.push({
        type: "Integrated",
        bracing: false,
        slots: [
          {
            weapon:
              refs.get(
                JSON.stringify([...prefix, "integratedMounts", k, "weapon"]),
              ) || null,
            mod:
              refs.get(
                JSON.stringify([
                  ...prefix,
                  "integratedMounts",
                  k,
                  "weapon",
                  "mod",
                ]),
              ) || null,
            size: "Integrated",
          },
        ],
      });
  return {
    "system.loadout.frame": refs.get(frameKey) || null,
    "system.loadout.systems": ["integratedSystems", "systems"]
      .flatMap((k) =>
        list(l[k]).map((_, n) => refs.get(JSON.stringify([...prefix, k, n]))),
      )
      .filter(Boolean),
    "system.loadout.weapon_mounts": weapon_mounts,
  };
}
async function restoreActor(actor, before) {
  const now = currentItems(actor),
    old = list(before.items),
    oldIds = new Set(old.map((x) => x._id)),
    nowIds = new Set(now.map((x) => x.id));
  const extra = now.filter((x) => !oldIds.has(x.id)).map((x) => x.id);
  if (extra.length) await actor.deleteEmbeddedDocuments("Item", extra);
  const missing = old.filter((x) => !nowIds.has(x._id));
  if (missing.length)
    await actor.createEmbeddedDocuments("Item", missing, { keepId: true });
  const updates = old.filter((x) => nowIds.has(x._id));
  if (updates.length)
    await actor.updateEmbeddedDocuments("Item", updates, {
      diff: false,
      recursive: false,
    });
  await actor.update(
    { name: before.name, system: before.system, flags: before.flags, img:before.img, ...(before.prototypeToken ? {prototypeToken:before.prototypeToken} : {}) },
    { diff: false, recursive: false },
  );
}
export async function applySheetPlan({
  plan,
  sheet,
  game,
  createActor,
  saveBackup,
  resolvePortrait,
}) {
  const pilot = plan.documents[0]?.actor;
  permission(pilot, game);
  validateSheet(sheet);
  if (plan.blocked)
    throw new Error(
      "A revisão contém impedimentos. Corrija-os antes de aplicar.",
    );
  if (plan.sheetFingerprint !== JSON.stringify(sheet.data) || plan.sourceFingerprint !== JSON.stringify(sheet.source))
    throw new Error(
      "O rascunho mudou depois da revisão. Prepare uma nova revisão.",
    );
  for (const doc of plan.documents)
    if (
      doc.actor &&
      JSON.stringify(doc.before) !== JSON.stringify(doc.actor.toObject())
    )
      throw new Error(
        `${doc.actor.name} mudou no Foundry após a revisão. Reabra a revisão para evitar sobrescrever outra edição.`,
      );
  const portraits = new Map(), downloaded = new Map();
  if (resolvePortrait) {
    for (const doc of plan.documents) if (doc.patch.img) {
      const source = doc.patch.img;
      if (!downloaded.has(source)) downloaded.set(source, await resolvePortrait(doc.actor || pilot, source));
      const path = downloaded.get(source);
      if (typeof path !== 'string' || !path) throw new Error('Não foi possível guardar o retrato importado.');
      portraits.set(doc, path);
    }
    // Downloads can take time: do not overwrite changes made while they ran.
    for (const doc of plan.documents) if (doc.actor && JSON.stringify(doc.before) !== JSON.stringify(doc.actor.toObject()))
      throw new Error(`${doc.actor.name} mudou no Foundry durante o download do retrato. Prepare uma nova revisão.`);
    if (plan.sheetFingerprint !== JSON.stringify(sheet.data) || plan.sourceFingerprint !== JSON.stringify(sheet.source)) throw new Error('O rascunho mudou durante o download. Prepare uma nova revisão.');
  }
  if (saveBackup)
    await saveBackup(
      plan.documents.filter((d) => d.before).map((d) => d.before),
    );
  permission(pilot, game);
  for (const doc of plan.documents) if (doc.actor && JSON.stringify(doc.before) !== JSON.stringify(doc.actor.toObject()))
    throw new Error(`${doc.actor.name} mudou no Foundry durante o backup. Prepare uma nova revisão.`);
  if (plan.sheetFingerprint !== JSON.stringify(sheet.data) || plan.sourceFingerprint !== JSON.stringify(sheet.source))
    throw new Error('O rascunho mudou durante o backup. Prepare uma nova revisão.');
  const touched = [];
  try {
    for (const doc of plan.documents) {
      if (!doc.actor) {
        doc.actor = await createActor({
          name: doc.raw.name,
          type: "mech",
          folder: pilot.folder?.id || null,
          ownership: copy(pilot.ownership || {}),
          flags: { [ID]: { sheetPilot: pilot.uuid } },
        });
        doc.uuid = doc.actor.uuid;
      }
      touched.push(doc);
      if (!doc.actor.canUserModify(game.user, "update"))
        throw new Error("Permissão de edição mudou.");
      const deletes = doc.items
        .filter((o) => o.kind === "delete")
        .map((o) => o.id);
      if (deletes.length)
        await doc.actor.deleteEmbeddedDocuments("Item", deletes);
      const creates = doc.items
          .filter((o) => o.kind === "create")
          .map((o) => o.data),
        updates = doc.items
          .filter((o) => o.kind === "update")
          .map((o) => o.data);
      const made = creates.length
        ? await doc.actor.createEmbeddedDocuments("Item", creates)
        : [];
      if (updates.length)
        await doc.actor.updateEmbeddedDocuments("Item", updates);
      const ref = refsFor(doc, made),
        patch = {
          ...doc.patch,
          ...(plan.parts.build ? loadoutPatch(doc, ref) : {}),
        };
      const portrait = portraits.get(doc) || doc.patch.img;
      if (portrait) {
        patch.img = portrait;
        if ('prototypeToken.texture.src' in patch) patch['prototypeToken.texture.src'] = portrait;
        const project = doc.before?.flags?.[ID]?.project;
        if (project?.views) patch[`flags.${ID}.project`] = syncPortraitProject(project, portrait);
        patch[`flags.${ID}.portraitSource`] = {remote:doc.patch.img, local:portrait, importedAt:Date.now()};
      }
      if (doc.type === "pilot") {
        if (plan.parts.identity && patch['system.cloud_id']) patch['system.last_cloud_update'] = new Date().toISOString();
        const linked = copy(sheet);
        linked.source.actorUuid = doc.actor.uuid;
        if (plan.parts.identity && patch['system.cloud_id']) {
          linked.source.code = patch['system.cloud_id'];
          linked.source.url = `https://compcon.app/link/pilot/${linked.source.code}/full/`;
        }
        patch[`flags.${ID}.sheetProject`] = linked;
      }
      await doc.actor.update(patch);
    }
  } catch (error) {
    const restored = await Promise.allSettled(
      touched
        .reverse()
        .map((d) =>
          d.created ? d.actor.delete() : restoreActor(d.actor, d.before),
        ),
    );
    const failures = restored.filter((x) => x.status === "rejected");
    throw new Error(
      failures.length
        ? `Aplicação falhou e ${failures.length} restauração(ões) falharam. Use o backup anterior. Causa: ${error.message}`
        : `Aplicação falhou; os documentos alterados foram restaurados. ${error.message}`,
    );
  }
  return { applied: touched.length, portrait:portraits.get(plan.documents[0]) || plan.documents[0].patch.img || null };
}
function packedDefinition(item) {
  const s = item.system?.toObject?.() || copy(item.system || {});
  function rename(v) {
    if (Array.isArray(v)) return v.map(rename);
    if (!v || typeof v !== "object") return v;
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k === "lid" ? "id" : k, rename(x)]),
    );
  }
  const packed = item.getFlag?.(ID, "packed") || item.flags?.[ID]?.packed;
  return {
    ...(packed?.data || packed || {}),
    name: item.name,
    id: s.lid,
    ...rename(s),
    nativeSystem: s,
  };
}
const refId = (ref) =>
  typeof ref === "string" ? ref : ref?.id || ref?.value?.id;
const pilotRef = (mech) =>
  mech.system?.pilot?.uuid ||
  mech.system?.pilot?.value?.uuid ||
  mech.system?.pilot ||
  mech.getFlag?.(ID, "sheetPilot");
function nativeStats(system, previous = {}) {
  const stats = copy(previous);
  stats.current ||= {};
  stats.max ||= {};
  for (const k of ["hp", "overshield", "heat", "structure", "stress"])
    if (system[k]) {
      stats.current[k] = system[k].value;
      stats.max[k] = system[k].max;
    }
  for (const k of [
    "armor",
    "evasion",
    "edef",
    "speed",
    "grit",
    "burn",
    "activations",
    "overcharge",
  ])
    if (system[k] != null) {
      stats.current[k] = system[k];
      stats.max[k] = system[k];
    }
  if (system.repairs) {
    stats.current.repairCapacity = system.repairs.value;
    stats.max.repairCapacity = system.repairs.max;
  }
  return stats;
}
function nativeEntry(item) {
  const entry = {
    id: item.system.lid,
    instanceId: item.id,
    data: packedDefinition(item),
    _foundryUuid: item.uuid,
  };
  for (const k of [
    "loaded",
    "destroyed",
    "cascading",
    "selected_profile_index",
  ])
    if (item.system[k] != null) entry[k] = item.system[k];
  if (item.system.uses?.value != null)
    entry.currentUses = item.system.uses.value;
  return entry;
}
function readNativeMech(actor, previous) {
  const s = actor.system,
    items = currentItems(actor),
    byId = new Map(items.map((x) => [x.id, x])),
    raw = previous ? copy(previous) : {};
  raw.id = s.lid || actor.id;
  raw.name = actor.name;
  raw.img = {...(raw.img || {}), cloud_portrait:actor.getFlag?.(ID,'portraitSource')?.remote || (/^(?:https:|data:)/i.test(actor.img || '') ? actor.img : '')};
  raw.notes = s.notes || "";
  raw.stats = nativeStats(s, raw.stats);
  raw.corePower = s.core_energy;
  raw.coreActive = s.core_active;
  const frame = byId.get(refId(s.loadout?.frame));
  if (frame) {
    raw.frame = frame.system.lid;
    raw.frameData = packedDefinition(frame);
  }
  const loadout = { name: "Loadout do Foundry", systems: [], mounts: [] };
  for (const ref of list(s.loadout?.systems)) {
    const item = byId.get(refId(ref));
    if (item) loadout.systems.push(nativeEntry(item));
  }
  for (const mount of list(s.loadout?.weapon_mounts))
    loadout.mounts.push({
      mount_type: mount.type,
      lock: !!mount.bracing,
      slots: list(mount.slots).map((slot) => {
        const item = byId.get(refId(slot.weapon)),
          mod = byId.get(refId(slot.mod)),
          weapon = item ? nativeEntry(item) : null;
        if (weapon && mod) weapon.mod = nativeEntry(mod);
        return { size: slot.size, weapon };
      }),
    });
  raw.loadouts ||= [];
  raw.active_loadout_index ||= 0;
  raw.loadouts[raw.active_loadout_index] = loadout;
  raw._foundryUuid = actor.uuid;
  return raw;
}
export function readNativePilot(actor, game) {
  permission(actor, game);
  const s = actor.system,
    old = actor.getFlag?.(ID, "sheetProject")?.data;
  const raw = old
    ? copy(old)
    : {
        itemType: "pilot",
        id: actor.id,
        originId: actor.id,
        name: actor.name,
        callsign: s.callsign || "",
        level: s.level || 0,
        mechs: [],
        skills: [],
        talents: [],
        licenses: [],
        core_bonuses: [],
        reserves: [],
        orgs: [],
        loadouts: [],
        active_index: 0,
        stats: { current: {}, max: {} },
      };
  raw.name = actor.name;
  raw.cloudID = s.cloud_id || '';
  raw.img = {...(raw.img || {}), cloud_portrait:actor.getFlag?.(ID,'portraitSource')?.remote || (/^(?:https:|data:)/i.test(actor.img || '') ? actor.img : '')};
  for (const k of [
    "callsign",
    "background",
    "history",
    "notes",
    "status",
    "text_appearance",
    "player_name",
    "level",
  ])
    if (s[k] != null) raw[k] = s[k];
  raw.mechSkills = [s.hull || 0, s.agi || 0, s.sys || 0, s.eng || 0];
  raw.stats ||= { current: {}, max: {} };
  raw.stats.current ||= {};
  raw.stats.max ||= {};
  for (const k of ["hp", "overshield", "heat", "structure", "stress"])
    if (s[k]) {
      raw.stats.current[k] = s[k].value;
      raw.stats.max[k] = s[k].max;
    }
  for (const k of [
    "armor",
    "evasion",
    "edef",
    "speed",
    "grit",
    "burn",
    "activations",
  ])
    if (s[k] != null) {
      raw.stats.current[k] = s[k];
      raw.stats.max[k] = s[k];
    }
  const items = currentItems(actor),
    byId = new Map(items.map((x) => [x.id, x])),
    reverse = Object.fromEntries(Object.entries(kinds).map(([k, v]) => [v, k]));
  for (const k of [
    "skills",
    "talents",
    "licenses",
    "core_bonuses",
    "reserves",
    "orgs",
  ])
    raw[k] = items
      .filter((x) => reverse[x.type] === k)
      .map((x) => ({
        id: x.system.lid,
        rank: x.system.curr_rank,
        data: packedDefinition(x),
        _foundryUuid: x.uuid,
      }));
  const loadout = {
    name: "Loadout do Foundry",
    armor: [],
    weapons: [],
    gear: [],
  };
  for (const k of ["armor", "weapons", "gear"])
    for (const ref of list(s.loadout?.[k])) {
      const item = byId.get(refId(ref));
      if (item) loadout[k].push(nativeEntry(item));
    }
  raw.loadouts ||= [];
  raw.active_index ||= 0;
  raw.loadouts[raw.active_index] = loadout;
  const linked = (game.actors?.contents || []).filter(
    (a) => a.type === "mech" && pilotRef(a) === actor.uuid,
  );
  for (const mech of linked) {
    const index = raw.mechs.findIndex(
      (m) => m.id === (mech.system.lid || mech.id),
    );
    const incoming = readNativeMech(mech, index >= 0 ? raw.mechs[index] : null);
    if (index >= 0) raw.mechs[index] = incoming;
    else raw.mechs.push(incoming);
  }
  return parsePilot(JSON.parse(JSON.stringify(raw)));
}

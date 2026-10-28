import { copy } from "./compcon.js";
import { storeData } from "./stored-data.js";
import { instanceIdentity } from "./sheet-identity.js";
import { ID, kinds, list, text, cleanObject } from "./sheet-common.js";
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
export function html(value) {
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
    names.map((n) => [
      n,
      values.some(
        (v) =>
          text(v).toLowerCase() === "any" ||
          text(v).toLowerCase() === n.toLowerCase(),
      ),
    ]),
  );
}
function synergy(s) {
  const values = (v) =>
    v == null || (typeof v === "object" && !Array.isArray(v))
      ? v
      : Array.isArray(v)
        ? v
        : [v];
  return {
    detail: text(s.detail),
    locations: (Array.isArray(s.locations)
      ? s.locations
      : s.locations
        ? [s.locations]
        : []
    ).flatMap((l) =>
      text(l)
        .toLowerCase()
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
    damage_types: checklist(values(s.damage_types), [
      "Burn",
      "Energy",
      "Explosive",
      "Heat",
      "Kinetic",
      "Variable",
    ]),
    range_types: checklist(values(s.range_types), [
      "Blast",
      "Burst",
      "Cone",
      "Line",
      "Range",
      "Threat",
    ]),
    weapon_types: checklist(values(s.weapon_types), [
      "Rifle",
      "Launcher",
      "Cannon",
      "CQB",
      "Melee",
      "Nexus",
    ]),
    weapon_sizes: checklist(values(s.weapon_sizes), [
      "Auxiliary",
      "Main",
      "Heavy",
      "Superheavy",
    ]),
    system_types: checklist(values(s.system_types), [
      "AI",
      "Armor",
      "Deployable",
      "Drone",
      "Flight System",
      "Integrated",
      "Mod",
      "Shield",
      "System",
      "Tech",
    ]),
  };
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
export function counter(c) {
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
    synergies: list(d.synergies).map(synergy),
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
      active_synergies: list(c.active_synergies).map(synergy),
      passive_synergies: list(c.passive_synergies).map(synergy),
    };
  }
  const stable = `${type}:${instanceIdentity(state) || state.id || d.id || entry.key}`;
  return {
    name: state.flavorName || d.name || state.id || type,
    type,
    system: cleanObject(system),
    flags: { [ID]: { sheetKey: stable, packed: storeData(state) } },
  };
}

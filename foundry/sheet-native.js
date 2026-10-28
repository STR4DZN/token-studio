import { copy, parsePilot } from "./compcon.js";
import { readData } from "./stored-data.js";
import { ID, kinds, list, currentItems, permission } from "./sheet-common.js";
function packedDefinition(item) {
  const s = item.system?.toObject?.() || copy(item.system || {});
  function rename(v) {
    if (Array.isArray(v)) return v.map(rename);
    if (!v || typeof v !== "object") return v;
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k === "lid" ? "id" : k, rename(x)]),
    );
  }
  const packed = readData(
    item.getFlag?.(ID, "packed") || item.flags?.[ID]?.packed,
  );
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
  raw.img = {
    ...(raw.img || {}),
    cloud_portrait:
      actor.getFlag?.(ID, "portraitSource")?.remote ||
      (/^(?:https:|data:)/i.test(actor.img || "") ? actor.img : ""),
  };
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
    old = readData(actor.getFlag?.(ID, "sheetProject"))?.data;
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
  raw.cloudID = s.cloud_id || "";
  raw.img = {
    ...(raw.img || {}),
    cloud_portrait:
      actor.getFlag?.(ID, "portraitSource")?.remote ||
      (/^(?:https:|data:)/i.test(actor.img || "") ? actor.img : ""),
  };
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

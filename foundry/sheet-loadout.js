import { copy } from "./compcon.js";
import { ID, list, managedInfo } from "./sheet-common.js";
export function refsFor(doc, created) {
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
export function loadoutPatch(doc, refs) {
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
export function mergeSource(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (
        !target[key] ||
        typeof target[key] !== "object" ||
        Array.isArray(target[key])
      )
        target[key] = {};
      mergeSource(target[key], value);
    } else target[key] = copy(value);
  }
  return target;
}
// A complete temporary source lets Foundry validate loadouts and actor fields
// before any embedded item is written. Preview IDs never enter the world.
export function plannedActorData(doc, parts) {
  const source = doc.before
    ? copy(doc.before)
    : { name: doc.raw.name, type: doc.type, system: {}, items: [] };
  const items = new Map(list(source.items).map((item) => [item._id, item])),
    refs = new Map();
  let index = 0;
  for (const op of doc.items) {
    if (op.kind === "delete") {
      items.delete(op.id);
      continue;
    }
    if (!op.data) continue;
    let id = op.id;
    if (!id)
      do {
        id = `ts${String(++index).padStart(14, "0")}`;
      } while (items.has(id));
    items.set(
      id,
      mergeSource(copy(items.get(id) || {}), { ...copy(op.data), _id: id }),
    );
    for (const path of [op.sourcePath, ...(op.aliasPaths || [])])
      refs.set(JSON.stringify(path), id);
  }
  const patch = {
    ...doc.patch,
    ...(parts.build ? loadoutPatch(doc, refs) : {}),
  };
  for (const [key, value] of Object.entries(patch)) {
    if (!key.includes(".")) {
      mergeSource(source, { [key]: value });
      continue;
    }
    const path = key.split(".");
    let target = source;
    for (const segment of path.slice(0, -1)) target = target[segment] ||= {};
    target[path.at(-1)] = copy(value);
  }
  source.items = [...items.values()];
  return source;
}

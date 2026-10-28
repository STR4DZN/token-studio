import {
  copy,
  parsePilot,
  entries,
  validateSheet,
  pilotPortrait,
  shareCode,
} from "./compcon.js";
import { isDefaultImage, syncPortraitProject } from "./actor-images.js";
import { readData } from "./stored-data.js";
import {
  instanceIdentity,
  instanceKinds,
  loadoutContext,
} from "./sheet-identity.js";
import { applyItemState } from "./item-state.js";
import {
  ID,
  list,
  currentItems,
  managedInfo,
  permission,
} from "./sheet-common.js";
import { toNativeItem, html, counter } from "./sheet-items.js";
import { plannedActorData } from "./sheet-loadout.js";
export { toNativeItem } from "./sheet-items.js";
export { plannedActorData } from "./sheet-loadout.js";
export { applySheetPlan } from "./sheet-apply.js";
export { readNativePilot } from "./sheet-native.js";
const snapshot = (actor) => copy(actor.toObject());
const normalizedItemKey = (e, native) => native.flags[ID].sheetKey;
function actorPatch(raw, parts, type = "pilot") {
  const patch = {};
  const stats = raw.stats?.current || {},
    max = raw.stats?.max || {};
  if (parts.identity) {
    patch["prototypeToken.name"] = raw.name;
    patch["prototypeToken.actorLink"] = true;
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
function blockingWarning(warnings, operation, message) {
  warnings.push(message);
  operation.blocked = true;
  (operation.issues ||= []).push(message);
}
function reviewTarget(doc) {
  return {
    key: doc.uuid || `mech:${doc.rawIndex}`,
    name: doc.actor?.name || doc.raw.name,
    type: doc.type,
  };
}
function itemPlan(
  actor,
  sourceEntries,
  parts,
  warnings,
  changes,
  retainedItems,
) {
  const operations = [],
    existing = currentItems(actor),
    used = new Set();
  function block(message) {
    const operation = {};
    blockingWarning(warnings, operation, message);
    operations.push(operation);
  }
  for (const e of sourceEntries) {
    let native, identity;
    try {
      identity = instanceIdentity(e.item);
      native = toNativeItem(e);
    } catch (error) {
      block(`${e.name}: ${error.message}`);
      continue;
    }
    const key = normalizedItemKey(e, native);
    const repeated = operations.find((o) => o.key === key);
    if (repeated) {
      if (
        instanceKinds.has(e.kind) &&
        (!identity ||
          loadoutContext(e.path) === loadoutContext(repeated.sourcePath))
      ) {
        blockingWarning(
          warnings,
          repeated,
          `${native.name}: instância repetida ou sem identificador inequívoco. Confira as montagens e os identificadores antes de aplicar.`,
        );
        continue;
      }
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
    const matches = existing.filter(
      (x) =>
        managedInfo(x) === key ||
        (e.item._foundryUuid && x.uuid === e.item._foundryUuid),
    );
    if (matches.length > 1) {
      block(
        `${native.name}: mais de um item corresponde à instância. A reconciliação é ambígua.`,
      );
      continue;
    }
    let item = matches[0];
    if (!item && identity) {
      const legacy = existing.filter((x) => {
        if (
          x.type !== native.type ||
          x.system?.lid !== native.system.lid ||
          managedInfo(x) !== `${native.type}:${native.system.lid}`
        )
          return false;
        const packed = readData(
          x.getFlag?.(ID, "packed") || x.flags?.[ID]?.packed,
        );
        try {
          const oldIdentity = instanceIdentity(packed);
          return !oldIdentity || oldIdentity === identity;
        } catch {
          return false;
        }
      });
      const incomingIds = new Set(
        sourceEntries
          .filter(
            (other) =>
              other.kind === e.kind &&
              (other.item.id || other.data.id) === native.system.lid,
          )
          .map((other) => {
            try {
              return instanceIdentity(other.item);
            } catch {
              return "";
            }
          }),
      );
      if (legacy.length > 1 || (legacy.length && incomingIds.size > 1)) {
        block(
          `${native.name}: chave legada ambígua para várias instâncias. Revise o vínculo antes de aplicar.`,
        );
        continue;
      }
      item = legacy[0];
      if (item)
        warnings.push(
          `${native.name}: o item legado será atualizado para o identificador de instância; seu estado anterior está no backup.`,
        );
    }
    if (!item) {
      const candidates = existing.filter(
        (x) =>
          x.type === native.type &&
          x.system?.lid === native.system.lid &&
          !managedInfo(x),
      );
      if (candidates.length > 1) {
        block(
          `${native.name}: vários itens externos com o mesmo ID; adoção ambígua.`,
        );
        continue;
      }
      const external = candidates[0];
      if (external) {
        if (!parts.adopt) {
          block(
            `${actor.name}: ${native.name} já existe fora do Token Studio. Marque a adoção de itens para atualizá-lo sem criar duplicata.`,
          );
          continue;
        }
        item = external;
        warnings.push(
          `${actor.name}: ${native.name} será adotado pelo Token Studio; o estado anterior será salvo no backup.`,
        );
      }
    }
    if (item && used.has(item.id)) {
      block(
        `${native.name}: o mesmo ID aparece mais de uma vez. Verifique as instâncias e loadouts.`,
      );
      continue;
    }
    if (item && managedInfo(item) && managedInfo(item) !== key)
      warnings.push(
        `${native.name}: vínculo de instância ${managedInfo(item)} → ${key} será reconciliado no mesmo item.`,
      );
    try {
      native = applyItemState(
        native,
        e.item,
        item?.system?.toObject?.() || item?.system,
        parts.combat,
      );
    } catch (error) {
      block(`${native.name}: ${error.message}`);
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
      } else {
        const message = `${item.name}: item gerenciado ausente na nova build; permanece no Foundry porque a remoção não foi selecionada.`;
        warnings.push(message);
        retainedItems.push({
          document: actor.name,
          itemId: item.id,
          name: item.name,
          type: item.type,
          message,
        });
      }
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
export async function prepareSheetPlan({
  actor,
  sheet,
  parts,
  game,
  validateItem,
  validateActor,
}) {
  permission(actor, game);
  validateSheet(sheet);
  const raw = parsePilot(sheet.data),
    warnings = [],
    changes = [],
    documents = [],
    retainedItems = [];
  const pilotEntries = entries(raw).filter((e) => e.path[0] !== "mechs");
  const patch = actorPatch(raw, parts);
  function addPortrait(target, data, patch) {
    if (!parts.portrait) return;
    const portrait = pilotPortrait(data);
    if (!portrait) {
      warnings.push(
        `${data.name}: a ficha não contém retrato publicado; a imagem atual será preservada.`,
      );
      return;
    }
    patch.img = portrait;
    if (isDefaultImage(target?.prototypeToken?.texture?.src))
      patch["prototypeToken.texture.src"] = portrait;
    const project = target?.getFlag?.(ID, "project");
    if (project?.views)
      patch[`flags.${ID}.project`] = syncPortraitProject(project, portrait);
  }
  addPortrait(actor, raw, patch);
  const items = parts.build
    ? itemPlan(actor, pilotEntries, parts, warnings, changes, retainedItems)
    : [];
  let code = sheet.source?.code || raw.cloudID || "";
  if (code) {
    try {
      code = shareCode(code);
    } catch {
      if (sheet.source?.code)
        throw new Error("Código de compartilhamento COMP/CON inválido.");
      code = "";
    }
  }
  if (parts.identity) {
    patch["system.cloud_id"] = code;
    if (code) patch["system.last_cloud_update"] = new Date().toISOString();
    patch[`flags.${ID}.compconLink`] = {
      actorUuid: actor.uuid,
      pilotId: raw.id,
      code,
      url: code ? `https://compcon.app/link/pilot/${code}/full/` : "",
      importedAt: Date.now(),
    };
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
  changes.forEach((change) => {
    change.target = reviewTarget(pilot);
  });
  retainedItems.forEach((item) => {
    item.target = reviewTarget(pilot);
  });
  if (parts.mechs) {
    for (const [index, mech] of raw.mechs.entries()) {
      const changeStart = changes.length,
        retainedStart = retainedItems.length;
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
        ? itemPlan(target, es, parts, warnings, changes, retainedItems)
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
      const reviewDestination = reviewTarget(documents.at(-1));
      changes.slice(changeStart).forEach((change) => {
        change.target = reviewDestination;
      });
      retainedItems.slice(retainedStart).forEach((item) => {
        item.target = reviewDestination;
      });
    }
  }
  if (validateItem)
    for (const doc of documents)
      for (const op of doc.items)
        if (op.data)
          try {
            await validateItem(op.data, doc.actor);
          } catch (e) {
            blockingWarning(
              warnings,
              op,
              `${op.data.name}: o schema do Lancer recusou o conteúdo (${e.message}). Nenhuma alteração será aplicada.`,
            );
          }
  if (validateActor)
    for (const doc of documents) {
      try {
        await validateActor(plannedActorData(doc, parts), doc);
      } catch (error) {
        blockingWarning(
          warnings,
          doc,
          `${doc.raw.name}: o Lancer recusou o ator completo (${error.message}). Nenhuma alteração será aplicada.`,
        );
      }
    }
  return {
    summary: `${raw.name} • ${documents.length} documento(s) • ${changes.length} alteração(ões) para revisar`,
    warnings: [...new Set(warnings)],
    changes,
    retainedItems,
    blockers: documents.flatMap((doc) =>
      [doc, ...doc.items].flatMap((operation) =>
        (operation.issues || []).map((message) => ({
          target: reviewTarget(doc),
          message,
        })),
      ),
    ),
    blocked: documents.some((d) => d.blocked || d.items.some((i) => i.blocked)),
    documents,
    parts: copy(parts),
    preparedAt: Date.now(),
    sheetFingerprint: JSON.stringify(sheet.data),
    sourceFingerprint: JSON.stringify(sheet.source),
  };
}

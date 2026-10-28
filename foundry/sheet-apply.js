import { copy, validateSheet } from "./compcon.js";
import { storeData } from "./stored-data.js";
import { syncPortraitProject, isDefaultImage } from "./actor-images.js";
import {
  ID,
  list,
  currentItems,
  managedInfo,
  permission,
} from "./sheet-common.js";
import { refsFor, loadoutPatch, mergeSource } from "./sheet-loadout.js";
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
    {
      name: before.name,
      system: before.system,
      flags: before.flags,
      img: before.img,
      ...(before.prototypeToken
        ? { prototypeToken: before.prototypeToken }
        : {}),
    },
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
  verifyActor,
}) {
  const pilot = plan.documents[0]?.actor;
  permission(pilot, game);
  validateSheet(sheet);
  if (plan.blocked)
    throw new Error(
      "A revisão contém impedimentos. Corrija-os antes de aplicar.",
    );
  if (
    plan.sheetFingerprint !== JSON.stringify(sheet.data) ||
    plan.sourceFingerprint !== JSON.stringify(sheet.source)
  )
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
  const portraits = new Map(),
    portraitCapabilities = new Map(),
    downloaded = new Map();
  if (resolvePortrait) {
    for (const doc of plan.documents)
      if (doc.patch.img) {
        const source = doc.patch.img;
        if (!downloaded.has(source)) {
          try {
            downloaded.set(
              source,
              await resolvePortrait(doc.actor || pilot, source),
            );
          } catch (error) {
            throw new Error(
              `Retrato de ${doc.raw.name}: ${error.message} A ficha não foi alterada. Revise a URL em Retrato por URL.`,
            );
          }
        }
        const resolved = downloaded.get(source),
          path = typeof resolved === "string" ? resolved : resolved?.url;
        portraitCapabilities.set(
          doc,
          typeof resolved === "string" || resolved?.editable !== false,
        );
        if (typeof path !== "string" || !path)
          throw new Error(
            "Não foi possível validar o endereço do retrato importado.",
          );
        portraits.set(doc, path);
      }
    // Downloads can take time: do not overwrite changes made while they ran.
    for (const doc of plan.documents)
      if (
        doc.actor &&
        JSON.stringify(doc.before) !== JSON.stringify(doc.actor.toObject())
      )
        throw new Error(
          `${doc.actor.name} mudou no Foundry durante o download do retrato. Prepare uma nova revisão.`,
        );
    if (
      plan.sheetFingerprint !== JSON.stringify(sheet.data) ||
      plan.sourceFingerprint !== JSON.stringify(sheet.source)
    )
      throw new Error(
        "O rascunho mudou durante o download. Prepare uma nova revisão.",
      );
  }
  if (saveBackup)
    await saveBackup(
      plan.documents.filter((d) => d.before).map((d) => d.before),
    );
  permission(pilot, game);
  for (const doc of plan.documents)
    if (
      doc.actor &&
      JSON.stringify(doc.before) !== JSON.stringify(doc.actor.toObject())
    )
      throw new Error(
        `${doc.actor.name} mudou no Foundry durante o backup. Prepare uma nova revisão.`,
      );
  if (
    plan.sheetFingerprint !== JSON.stringify(sheet.data) ||
    plan.sourceFingerprint !== JSON.stringify(sheet.source)
  )
    throw new Error(
      "O rascunho mudou durante o backup. Prepare uma nova revisão.",
    );
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
        const editable = portraitCapabilities.get(doc) !== false;
        if ("prototypeToken.texture.src" in patch) {
          if (editable) patch["prototypeToken.texture.src"] = portrait;
          else delete patch["prototypeToken.texture.src"];
        }
        const project = doc.before?.flags?.[ID]?.project;
        if (project?.views) {
          const synced = syncPortraitProject(project, portrait);
          synced.views.portrait.displayOnly = !editable;
          if (!editable) synced.views.token = copy(project.views.token);
          patch[`flags.${ID}.project`] = synced;
        }
        patch[`flags.${ID}.portraitSource`] = {
          remote: /^https:/.test(portrait) ? portrait : doc.patch.img,
          local: /^https:/.test(portrait) ? null : portrait,
          mode: /^https:/.test(portrait) ? "url" : "local",
          editable,
          importedAt: Date.now(),
        };
      }
      if (doc.type === "pilot") {
        if (plan.parts.identity && patch["system.cloud_id"])
          patch["system.last_cloud_update"] = new Date().toISOString();
        const linked = copy(sheet);
        linked.source.actorUuid = doc.actor.uuid;
        if (plan.parts.identity && patch["system.cloud_id"]) {
          linked.source.code = patch["system.cloud_id"];
          linked.source.url = `https://compcon.app/link/pilot/${linked.source.code}/full/`;
        }
        patch[`flags.${ID}.sheetProject`] = storeData(linked);
      }
      await doc.actor.update(patch);
    }
    if (plan.parts.mechs) {
      const mechs = plan.documents.filter((doc) => doc.type === "mech");
      if (mechs.length) {
        const preferred =
          sheet.data.favorite_mech || sheet.data.state?.active_mech_id;
        const active =
          mechs.find((doc) => doc.raw.id === preferred) || mechs[0];
        await pilot.update({ "system.active_mech": active.actor.uuid });
      }
    }
    if (verifyActor)
      for (const doc of touched) {
        try {
          await verifyActor(doc.actor);
        } catch (error) {
          throw new Error(
            `${doc.raw.name}: a ficha nativa do Lancer não pôde ser preparada (${error.message}).`,
          );
        }
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
  return {
    applied: touched.length,
    portraitEditable: portraitCapabilities.has(plan.documents[0])
      ? portraitCapabilities.get(plan.documents[0]) !== false
      : pilot.getFlag?.(ID, "portraitSource")?.editable !== false,
    portrait:
      portraits.get(plan.documents[0]) || plan.documents[0].patch.img || null,
  };
}

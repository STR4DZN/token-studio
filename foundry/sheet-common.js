export const ID = "token-studio";
export const kinds = {
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
export const currentItems = (actor) =>
  actor.items?.contents || Array.from(actor.items?.values?.() || []);
export const text = (value) => (value == null ? "" : String(value));
export const list = (value) => (Array.isArray(value) ? value : []);
export const cleanObject = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
export function managedInfo(item) {
  return (
    item.getFlag?.(ID, "sheetKey") ||
    flagKey(item.toObject ? item.toObject() : item)
  );
}
export function permission(actor, game) {
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

// One identity contract for diagnostics, legacy COMP/CON and native documents.
export function instanceIdentity(item = {}) {
  const ids = ['instanceId', 'instance_id'].map(key => item[key]).filter(value => value != null && value !== '');
  if (ids.some(value => typeof value !== 'string')) throw new Error('Identificador de instância inválido.');
  if (new Set(ids).size > 1) throw new Error('Identificadores instanceId e instance_id conflitantes. Revise esta instância.');
  if (item._foundryUuid != null && typeof item._foundryUuid !== 'string') throw new Error('Identificador de documento nativo inválido.');
  return ids[0] || item._foundryUuid || '';
}

export function loadoutContext(path) {
  if (path[0] === 'loadouts') return JSON.stringify(path.slice(0, 2));
  if (path[0] === 'mechs' && path[2] === 'loadouts') return JSON.stringify(path.slice(0, 4));
  return '';
}

export const instanceKinds = new Set(['armor', 'weapons', 'gear', 'systems', 'mech_weapons', 'weapon_mods']);

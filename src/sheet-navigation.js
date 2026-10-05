export function sheetUnitIndex(data, selected) {
  return Number.isInteger(selected) && selected >= 0 && selected < (data?.mechs?.length || 0) ? selected : -1;
}
export function loadoutEntries(entries, unitIndex, loadoutIndex) {
  return entries.filter(e => unitIndex < 0
    ? e.path[0] === 'loadouts' && e.path[1] === loadoutIndex
    : e.path[0] === 'mechs' && e.path[1] === unitIndex && e.path[2] === 'loadouts' && e.path[3] === loadoutIndex);
}
export function unitActions(actions, unitIndex, {includeInactive = false, activation = '', query = ''} = {}) {
  const term = query.toLowerCase();
  return actions.filter(a => (unitIndex < 0 ? a.path[0] !== 'mechs' : a.path[0] === 'mechs' && a.path[1] === unitIndex)
    && (includeInactive || a.active) && (!activation || a.action.activation === activation)
    && `${a.name} ${a.owner} ${a.action.terse || ''} ${a.action.detail || ''} ${a.action.trigger || ''}`.replace(/<[^>]*>/g,' ').toLowerCase().includes(term));
}
export function mountTitle(entry, mech) {
  const path = entry.path, key = path[4], loadout = mech.loadouts?.[path[3]];
  if (key === 'mounts') return `Montagem ${path[5]+1} • ${loadout?.mounts?.[path[5]]?.mount_type || 'Armas'}${path[6]==='extra'?' • Extra':''}`;
  return ({integratedMounts:'Arma integrada',integratedSystems:'Sistema integrado',systems:'Sistema',improved_armament:'Improved Armament',integratedWeapon:'Arma integrada',superheavy_mounting:'Montagem superheavy'})[key] || 'Equipamento';
}

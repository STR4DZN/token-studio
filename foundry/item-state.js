const fields = {
  uses: state => state.currentUses != null ? {value: state.currentUses} : state.uses != null ? {value: typeof state.uses === 'object' ? state.uses.value : state.uses} : undefined,
  loaded: state => state.loaded,
  destroyed: state => state.destroyed,
  cascading: state => state.cascading,
  selected_profile_index: state => state.selected_profile_index,
};

// Definition import and session state are separate choices. Missing remote
// fields never imply a reset, and new items can use the installed DataModel's defaults.
export function applyItemState(native, remote, previous, combat) {
  native = structuredClone(native);
  const system = native.system;
  for (const [field, read] of Object.entries(fields)) {
    if (!Object.hasOwn(system, field)) continue;
    const incoming = combat ? read(remote) : undefined;
    const value = incoming !== undefined ? incoming : previous?.[field];
    if (value === undefined) delete system[field];
    else system[field] = structuredClone(value);
  }
  const selected = system.selected_profile_index;
  if (system.profiles && selected != null && (!Number.isInteger(selected) || selected < 0 || selected >= system.profiles.length)) {
    throw new Error('O perfil selecionado não existe na nova definição. Escolha um perfil válido ou revise a build antes de aplicar.');
  }
  preserveCounters(system, previous, combat ? remote.data || remote : null);
  return native;
}

function preserveCounters(definition, previous, remote) {
  if (!definition || typeof definition !== 'object') return;
  if (Array.isArray(definition)) {
    definition.forEach((value, index) => preserveCounters(value, previous?.[index], remote?.[index]));
    return;
  }
  for (const [key, value] of Object.entries(definition)) {
    if (key !== 'counters' || !Array.isArray(value)) {
      if (value && typeof value === 'object') preserveCounters(value, previous?.[key], remote?.[key]);
      continue;
    }
    for (const counter of value) {
      const matches = candidate => (candidate.lid || candidate.id || candidate.name) === (counter.lid || counter.id || counter.name);
      const old = previous?.counters?.find(matches), incoming = remote?.counters?.find(matches);
      const count = incoming?.value ?? incoming?.val ?? old?.value;
      if (count == null) delete counter.value;
      else {
        if (count < (counter.min ?? -Infinity) || count > (counter.max ?? Infinity)) throw new Error(`Contador ${counter.name || counter.lid}: o valor atual não cabe nos novos limites. Revise antes de aplicar.`);
        counter.value = count;
      }
    }
  }
}

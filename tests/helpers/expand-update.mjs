// Model the recursive dotted-key expansion used by document updates. Unlike
// the old fake actors this traverses flag payloads, not just the outer patch.
export function expandUpdate(value) {
  if (!value || typeof value!=='object') return value;
  if (Array.isArray(value)) return value.map(expandUpdate);
  const result={};
  for (const [key,child] of Object.entries(value)) {
    const path=key.split('.');let target=result;
    for (const part of path.slice(0,-1)) {if (!(part in target)) target[part]={};target=target[part];}
    const last=path.at(-1);
    // Foundry also checks whether the terminal key already exists.
    const present=last in target;
    target[last]=expandUpdate(child);
  }
  return result;
}

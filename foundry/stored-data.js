// Foundry expands dotted keys recursively during document updates. COMP/CON's
// sync timestamps are literal keys and can name both a value and its children.
// Keep such payloads opaque to Foundry without discarding any original fields.
const FORMAT = 'token-studio-json-1';
function hasDottedKeys(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => key.includes('.') || hasDottedKeys(child));
}
export function storeData(value) {
  return hasDottedKeys(value) ? {encoding:FORMAT, json:JSON.stringify(value)} : structuredClone(value);
}
export function readData(value) {
  if (value?.encoding === FORMAT) {
    if (typeof value.json !== 'string') throw new Error('Dados armazenados da ficha inválidos.');
    return JSON.parse(value.json);
  }
  return value;
}

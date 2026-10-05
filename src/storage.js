let connection;
function open() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open('token-studio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects');
    request.onsuccess = () => resolve(request.result); request.onerror = () => { connection = null; reject(request.error); };
  });
  return connection;
}
export async function readDraft(key) {
  const db = await open();
  return new Promise((resolve, reject) => { const req = db.transaction('projects').objectStore('projects').get(key); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
export async function writeDraft(key, project) {
  const db = await open();
  return new Promise((resolve, reject) => { const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(project, key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}
export function readPresets() { try { return JSON.parse(localStorage.getItem('token-studio-presets') || '[]'); } catch { return []; } }
export function writePresets(presets) { localStorage.setItem('token-studio-presets', JSON.stringify(presets)); }

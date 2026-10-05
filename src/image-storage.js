export async function imageFilename(blob,crypto=globalThis.crypto) {
  const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[blob.type];
  if(!extension)throw new Error('Tipo de imagem não permitido para armazenamento.');
  const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')+'.'+extension;
}
export function storedImage(files,filename) {
  return (files||[]).find(path=>{try{return typeof path==='string' && decodeURIComponent(path.split('?')[0].split('/').at(-1))===filename;}catch{return false;}});
}

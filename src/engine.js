// Coordinates are normalized to the output canvas, never to the source bitmap.
import { assetPath } from './asset-path.js';
export const SCHEMA = 1;
export const clone = value => structuredClone(value);
export function createView(src, token = true) {
  return { src, fit: 'cover', zoom: 1, x: 0, y: 0, rotation: 0, aspect: token ? '1:1' : '2:3', frame: token ? 'silver' : 'none', frameSrc: '', color: '#b5a2fa', background: 'transparent', backgroundColor: '#25242d', aperture: .82, opacity: 1, shape: token ? 'circle' : 'rectangle', mask: 'circle', animated: false };
}
export function createProject(src) {
  return { schema: SCHEMA, active: 'token', views: { token: createView(src), portrait: createView(src, false) }, updatedAt: Date.now() };
}
export function validateProject(project) {
  if (!project || project.schema !== SCHEMA || !['token', 'portrait'].includes(project.active)) throw new Error('Projeto inválido ou versão não suportada.');
  for (const key of ['token', 'portrait']) {
    const v = project.views?.[key];
    if (!v || typeof v.src !== 'string' || v.src.length > 50_000_000) throw new Error('Imagem de origem inválida.');
    if (/^(?:javascript|vbscript):/i.test(v.src) || (/^data:/i.test(v.src) && !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(v.src))) throw new Error('Formato de imagem não permitido.');
    if(v.displayOnly!=null && typeof v.displayOnly!=='boolean')throw new Error('Estado de acesso à imagem inválido.');
    for (const p of ['zoom', 'x', 'y', 'rotation', 'aperture', 'opacity']) if (!Number.isFinite(v[p])) throw new Error('Ajustes de imagem inválidos.');
    if (v.zoom < .1 || v.zoom > 8 || v.aperture < .1 || v.aperture > 1 || v.opacity < 0 || v.opacity > 1 || Math.abs(v.x) > 100 || Math.abs(v.y) > 100 || Math.abs(v.rotation) > 3600) throw new Error('Ajustes fora dos limites.');
    if (!['cover', 'contain', 'free'].includes(v.fit) || !['1:1', '2:3', '3:4', '16:9'].includes(v.aspect) || !['circle', 'rectangle'].includes(v.shape) || !['circle', 'auto', 'rectangle'].includes(v.mask)) throw new Error('Enquadramento inválido.');
    if (!['none', 'silver', 'gold', 'graphite', 'custom'].includes(v.frame) || !['transparent', 'solid'].includes(v.background)) throw new Error('Estilo inválido.');
    if (!/^#[0-9a-f]{6}$/i.test(v.color) || !/^#[0-9a-f]{6}$/i.test(v.backgroundColor)) throw new Error('Cor inválida.');
    if (typeof v.frameSrc !== 'string' || /^(?:javascript|vbscript):/i.test(v.frameSrc) || (/^data:/i.test(v.frameSrc) && !/^data:image\/(png|webp);base64,/i.test(v.frameSrc))) throw new Error('Borda inválida.');
  }
  return project;
}
export function outputSize(view, size = 512) {
  const [a, b] = view.aspect.split(':').map(Number);
  return { width: Math.round(size * Math.min(1, a / b)), height: Math.round(size * Math.min(1, b / a)) };
}
function frameRectangle(frame, width, height) { const scale=Math.min(width/frame.width,height/frame.height),w=frame.width*scale,h=frame.height*scale;return {x:(width-w)/2,y:(height-h)/2,width:w,height:h}; }
function cropSize(view,width,height) { if(view.frame==='none')return {width:view.shape==='circle'?width*view.aperture:width,height:view.shape==='circle'?height*view.aperture:height};const ratio=view.frame==='custom'?(view.frameRatio||1):1;const w=Math.min(width,height*ratio),h=w/ratio;return {width:w*view.aperture,height:h*view.aperture}; }
export function geometry(view, image, width, height) {
  const aperture = view.shape === 'circle' || view.frame !== 'none' ? view.aperture : 1;
  const crop = cropSize(view,width,height),cropW=crop.width,cropH=crop.height;
  const angle = view.rotation * Math.PI / 180;
  const c = Math.cos(angle), s = Math.sin(angle);
  const neededW = Math.abs(c) * cropW + Math.abs(s) * cropH;
  const neededH = Math.abs(s) * cropW + Math.abs(c) * cropH;
  let contain;
  if (view.shape === 'circle') {
    const corners = [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
    const norm = Math.max(...corners.map(([x,y]) => Math.hypot((c*x*image.width-s*y*image.height)/(cropW/2),(s*x*image.width+c*y*image.height)/(cropH/2))));
    contain = 1 / norm;
  } else contain = Math.min(cropW/(Math.abs(c)*image.width+Math.abs(s)*image.height),cropH/(Math.abs(s)*image.width+Math.abs(c)*image.height));
  const base = view.fit === 'contain' ? contain : Math.max(neededW / image.width, neededH / image.height);
  return { aperture, cropW, cropH, angle, c, s, base, scale: base * view.zoom, neededW, neededH };
}
export function constrain(view, image, width = 512, height = 512) {
  const next = { ...view, zoom: Math.max(view.fit === 'cover' ? 1 : .1, Math.min(8, view.zoom)) };
  if (next.fit !== 'cover') return next;
  const g = geometry(next, image, width, height);
  const dx = next.x * width, dy = next.y * height;
  let lx = g.c * dx + g.s * dy, ly = -g.s * dx + g.c * dy;
  const maxX = Math.max(0, (image.width * g.scale - g.neededW) / 2);
  const maxY = Math.max(0, (image.height * g.scale - g.neededH) / 2);
  lx = Math.max(-maxX, Math.min(maxX, lx)); ly = Math.max(-maxY, Math.min(maxY, ly));
  next.x = (g.c * lx - g.s * ly) / width; next.y = (g.s * lx + g.c * ly) / height;
  return next;
}
const imageCache = new Map();
export async function loadImage(src) {
  if (!src) return null;
  if (imageCache.has(src)) return imageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(Object.assign(new Error('Não foi possível carregar a imagem. Confira o arquivo ou o acesso ao endereço.'), {code:'IMAGE_LOAD', source:src}));
    image.src = src;
  });
  imageCache.set(src, promise);
  if(imageCache.size>16)imageCache.delete(imageCache.keys().next().value);
  try { return await promise; } catch (error) { imageCache.delete(src); throw error; }
}
export function clearImageCache() { imageCache.clear(); }
export function imageDimensions(image) { return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height }; }
export function createCanvas(width, height) { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas; }
export function framePath(view, assetsBase) { return view.frame === 'custom' ? view.frameSrc : view.frame === 'none' ? '' : assetPath(assetsBase, 'frame-silver.png'); }
export async function loadResources(view, assetsBase) {
  const [image, frame] = await Promise.all([loadImage(view.src), loadImage(framePath(view, assetsBase))]);
  return { image, frame, dimensions: image ? imageDimensions(image) : null };
}
// Find only the enclosed transparent region. Exterior alpha is not a portrait mask.
export function enclosedMask(frame, size = 256) {
  const canvas = createCanvas(size, size), ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(frame, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size), out = ctx.createImageData(size, size);
  const visited = new Uint8Array(size * size), queue = new Int32Array(size * size);
  const seed = Math.floor(size / 2) * size + Math.floor(size / 2);
  if (data.data[seed * 4 + 3] > 40) return null;
  let read = 0, write = 1, open = false; queue[0] = seed; visited[seed] = 1;
  while (read < write) {
    const idx = queue[read++], x = idx % size, y = Math.floor(idx / size);
    if (x === 0 || y === 0 || x === size - 1 || y === size - 1) open = true;
    out.data[idx * 4 + 3] = 255;
    for (const n of [x > 0 ? idx - 1 : -1, x < size - 1 ? idx + 1 : -1, y > 0 ? idx - size : -1, y < size - 1 ? idx + size : -1]) {
      if (n >= 0 && !visited[n] && data.data[n * 4 + 3] < 250) { visited[n] = 1; queue[write++] = n; }
    }
  }
  if (open || write < size * size * .02) return null;
  ctx.putImageData(out, 0, 0);
  return canvas;
}
export function maskAperture(mask) {const {width,height}=mask,data=mask.getContext('2d').getImageData(0,0,width,height).data;let bound=0;for(let i=0;i<width*height;i++)if(data[i*4+3])bound=Math.max(bound,Math.abs((i%width+.5)/width-.5)*2,Math.abs((Math.floor(i/width)+.5)/height-.5)*2);return Math.min(1,bound+.015);}
const masks = new WeakMap();
function getMask(frame) { if (!masks.has(frame)) masks.set(frame, enclosedMask(frame)); return masks.get(frame); }
function drawSource(ctx, view, resources, width, height) {
  if (!resources.image) return;
  const g = geometry(view, resources.dimensions, width, height);
  ctx.save(); ctx.globalAlpha = view.opacity; ctx.translate(width / 2 + view.x * width, height / 2 + view.y * height); ctx.rotate(g.angle);
  ctx.drawImage(resources.image, -resources.dimensions.width * g.scale / 2, -resources.dimensions.height * g.scale / 2, resources.dimensions.width * g.scale, resources.dimensions.height * g.scale);
  ctx.restore();
}
function clipPath(ctx, view, width, height) {
  const crop=cropSize(view,width,height);
  ctx.beginPath();
  if (view.shape === 'circle') ctx.ellipse(width / 2, height / 2, crop.width/2,crop.height/2,0,0,Math.PI*2);
  else ctx.rect((width-crop.width)/2,(height-crop.height)/2,crop.width,crop.height);
}
export function renderOutput(canvas, view, resources, withFrame = true) {
  const { width, height } = canvas, ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  const content = createCanvas(width, height), cc = content.getContext('2d');
  if (view.background === 'solid') { cc.fillStyle = view.backgroundColor; cc.fillRect(0, 0, width, height); }
  drawSource(cc, view, resources, width, height);
  cc.globalCompositeOperation = 'destination-in';
  const auto = view.mask === 'auto' && resources.frame ? getMask(resources.frame) : null;
  if (auto) {const r=frameRectangle(resources.frame,width,height);cc.drawImage(auto,r.x,r.y,r.width,r.height);}
  else { cc.fillStyle = '#000'; clipPath(cc, view, width, height); cc.fill(); }
  ctx.drawImage(content, 0, 0);
  if (withFrame && resources.frame && view.frame !== 'none') {
    const r=frameRectangle(resources.frame,width,height);
    if (view.frame === 'custom') ctx.drawImage(resources.frame,r.x,r.y,r.width,r.height);
    else {
      const frame = createCanvas(width, height), fc = frame.getContext('2d'); fc.drawImage(resources.frame,r.x,r.y,r.width,r.height);
      fc.globalCompositeOperation = 'source-atop'; fc.globalAlpha = .35;
      fc.fillStyle = view.frame === 'gold' ? '#d8a94c' : view.frame === 'graphite' ? '#24232d' : view.color; fc.fillRect(0, 0, width, height);
      ctx.drawImage(frame, 0, 0);
    }
  }
  return canvas;
}
export function renderStage(canvas, view, resources, size, dpr = 1) {
  const ctx = canvas.getContext('2d'), width = canvas.width / dpr, height = canvas.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
  const scale = Math.min(width / size.width, height / size.height) * 1.05;
  const left = (width - size.width * scale) / 2, top = (height - size.height * scale) / 2;
  ctx.save(); ctx.translate(left, top); ctx.scale(scale, scale);
  drawSource(ctx, view, resources, size.width, size.height);
  ctx.restore();
  ctx.fillStyle = 'rgba(17,17,24,.60)'; ctx.fillRect(0, 0, width, height);
  const result = createCanvas(size.width, size.height); renderOutput(result, view, resources, false);
  ctx.drawImage(result, left, top, size.width * scale, size.height * scale);
  ctx.save(); ctx.translate(left, top); ctx.scale(scale, scale); ctx.strokeStyle = '#c7b8ff'; ctx.lineWidth = 2 / scale;
  clipPath(ctx, view, size.width, size.height); ctx.stroke(); ctx.restore();
  return { left, top, scale };
}
export async function exportView(view, assetsBase, size = 1024, format = 'image/png') {
  const resources = await loadResources(view, assetsBase);
  if (!resources.image) throw new Error('Escolha uma imagem antes de exportar.');
  const dimensions = outputSize(view, size), canvas = createCanvas(dimensions.width, dimensions.height);
  renderOutput(canvas, view, resources);
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, format, .94));
    if (!blob) throw new Error('Falha ao exportar a imagem.');
    return blob;
  } catch (error) { if (error.name === 'SecurityError') throw new Error('O endereço externo bloqueou a exportação. Importe o arquivo pelo computador.'); throw error; }
}
export function presetFromView(view) { const { src, animated, ...style } = view; return style; }
export function applyPreset(view, preset) { return { ...view, ...preset, src: view.src, animated: view.animated }; }
export function downloadBlob(blob, filename, automatic = true) {
  const url = URL.createObjectURL(blob);
  if(automatic){const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return {url,filename,type:blob.type,size:blob.size};
}

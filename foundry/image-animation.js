// Container inspection, not image decoding. Unknown/truncated data stays unknown.
// GIF89a: https://www.w3.org/Graphics/GIF/spec-gif89a.txt
// WebP: https://developers.google.com/speed/webp/docs/riff_container
export const animationStates = new Set(['animated', 'static', 'unknown']);
const text = (bytes, offset, size) => String.fromCharCode(...bytes.subarray(offset, offset + size));
const MAX_BYTES = 30 * 1024 * 1024;

function gifAnimation(bytes) {
  if (bytes.length < 13) return 'unknown';
  let position = 13 + ((bytes[10] & 0x80) ? 3 * 2 ** ((bytes[10] & 7) + 1) : 0);
  let frames = 0;
  function subblocks() {
    while (position < bytes.length) {
      const size = bytes[position++];
      if (!size) return true;
      position += size;
      if (position > bytes.length) return false;
    }
    return false;
  }
  while (position < bytes.length) {
    const kind = bytes[position++];
    if (kind === 0x3b) return frames ? (frames > 1 ? 'animated' : 'static') : 'unknown';
    if (kind === 0x21) {
      position++; // Extension label; following data is length-prefixed.
      if (!subblocks()) return 'unknown';
    } else if (kind === 0x2c) {
      if (position + 9 > bytes.length) return 'unknown';
      const flags = bytes[position + 8];
      position += 9 + ((flags & 0x80) ? 3 * 2 ** ((flags & 7) + 1) : 0);
      position++; // LZW minimum code size.
      if (!subblocks()) return 'unknown';
      if (++frames > 1) return 'animated';
    } else return 'unknown';
  }
  return 'unknown';
}

function webpAnimation(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = view.getUint32(4, true) + 8;
  if (end > bytes.length || end < 12) return 'unknown';
  let image = false;
  for (let position = 12; position < end;) {
    if (position + 8 > end) return 'unknown';
    const kind = text(bytes, position, 4), size = view.getUint32(position + 4, true);
    if (position + 8 + size + (size & 1) > end) return 'unknown';
    if (kind === 'VP8X' && size >= 10 && (bytes[position + 8] & 2)) return 'animated';
    if (kind === 'ANIM' && size >= 6 || kind === 'ANMF' && size >= 16) return 'animated';
    if ((kind === 'VP8 ' || kind === 'VP8L') && size) image = true;
    position += 8 + size + (size & 1);
  }
  return image ? 'static' : 'unknown';
}

function pngAnimation(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let image = false;
  for (let position = 8; position < bytes.length;) {
    if (position + 12 > bytes.length) return 'unknown';
    const size = view.getUint32(position), kind = text(bytes, position + 4, 4);
    if (position + 12 + size > bytes.length) return 'unknown';
    // APNG is preserved as unknown: this editor does not decode its frame controls.
    if (kind === 'acTL') return 'unknown';
    if (kind === 'IDAT') image = true;
    if (kind === 'IEND') return image ? 'static' : 'unknown';
    position += 12 + size;
  }
  return 'unknown';
}

export function detectAnimation(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (/^GIF8[79]a$/.test(text(bytes, 0, 6))) return gifAnimation(bytes);
  if (bytes.length >= 12 && text(bytes, 0, 4) === 'RIFF' && text(bytes, 8, 4) === 'WEBP') return webpAnimation(bytes);
  if (bytes.length >= 8 && bytes[0] === 137 && text(bytes, 1, 7) === 'PNG\r\n\x1a\n') return pngAnimation(bytes);
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'static';
  return 'unknown';
}

export async function inspectAnimation(blob) {
  if (!blob || blob.size > MAX_BYTES) return 'unknown';
  return detectAnimation(new Uint8Array(await blob.arrayBuffer()));
}

export async function inspectAnimationSource(source, {fetcher = fetch} = {}) {
  try {
    const response = await fetcher(source, {credentials:/^https?:/i.test(source) ? 'omit' : 'same-origin', referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});
    if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES) return 'unknown';
    return await inspectAnimation(await response.blob());
  } catch { return 'unknown'; }
}

export function animationPatch(animation) {
  return {animation:animationStates.has(animation) ? animation : 'unknown', animated:animation === 'animated'};
}

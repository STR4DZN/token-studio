// A routed directory is not guaranteed to retain its trailing slash.
// Join at the boundary without changing a server prefix or an absolute URL.
export function assetPath(base, file = '') {
  return `${base.replace(/\/+$/, '')}/${file.replace(/^\/+/, '')}`;
}

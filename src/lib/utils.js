export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function createPageUrl(path) {
  if (!path) return '/';
  if (path.startsWith('/')) return path;
  return `/${path}`;
}

export function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}
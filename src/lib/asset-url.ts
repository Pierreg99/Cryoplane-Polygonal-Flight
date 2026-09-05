/** Prefix a public-path with Vite `base` (e.g. `/Cryoplane-Polygonal-Flight/` on Pages). */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const clean = path.replace(/^\//, "");
  if (!clean) return base.endsWith("/") ? base : `${base}/`;
  return `${base.endsWith("/") ? base : `${base}/`}${clean}`;
}

/**
 * Figures out the public https address of this app (needed for links sent to tenants in LINE).
 * The Cloudflare quick tunnel address changes every time it is started, so it is not hard-coded:
 *  1) PUBLIC_APP_URL in .env (if set)
 *  2) the address of the current request, when the owner opened the app through the tunnel
 *  3) the address LINE last used to call /api/line/webhook (remembered in server memory)
 */
const g = globalThis as unknown as { __pakdeePublicOrigin?: string };

function originOf(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return host ? `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}` : "";
}

function isPublic(origin: string): boolean {
  return /^https:\/\//.test(origin) && !/\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.)/.test(origin);
}

/** Call from routes that are reached through the public address (e.g. the LINE webhook). */
export function rememberPublicOrigin(req: Request): void {
  const origin = originOf(req);
  if (isPublic(origin)) g.__pakdeePublicOrigin = origin;
}

export function getPublicOrigin(req: Request): string {
  const env = (process.env.PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (env) return env;
  const current = originOf(req);
  if (isPublic(current)) return current;
  return g.__pakdeePublicOrigin || "";
}

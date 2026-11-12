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

/**
 * Asks the running Cloudflare quick tunnel (`cloudflared tunnel --url …`) for its current address.
 * cloudflared serves it on its local metrics port (127.0.0.1:20241–20245) at /quicktunnel.
 */
async function detectQuickTunnel(): Promise<string> {
  for (let port = 20241; port <= 20245; port++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/quicktunnel`, { signal: AbortSignal.timeout(1500), cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json().catch(() => ({}))) as { hostname?: string };
      if (data.hostname && /^[a-z0-9.-]+$/i.test(data.hostname)) return `https://${data.hostname}`;
    } catch {
      // port not used by cloudflared
    }
  }
  return "";
}

/** Like getPublicOrigin, and also asks cloudflared when nothing else is known (always the current tunnel). */
export async function resolvePublicOrigin(req: Request): Promise<string> {
  const env = (process.env.PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (env) return env;
  const current = originOf(req);
  if (isPublic(current)) return current;
  const tunnel = await detectQuickTunnel();
  if (tunnel) {
    g.__pakdeePublicOrigin = tunnel;
    return tunnel;
  }
  return g.__pakdeePublicOrigin || "";
}

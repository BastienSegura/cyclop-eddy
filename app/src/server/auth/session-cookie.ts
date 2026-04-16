import { getSessionCookiePolicy } from "./config";

function parseCookieHeader(headerValue: string): Record<string, string> {
  const entries = headerValue.split(";");
  const parsed: Record<string, string> = {};

  for (const entry of entries) {
    const [rawName, ...rawValue] = entry.split("=");
    const name = rawName?.trim();
    if (!name) {
      continue;
    }

    const value = rawValue.join("=").trim();
    parsed[name] = decodeURIComponent(value);
  }

  return parsed;
}

export function readSessionTokenFromRequest(request: Request): string | null {
  const cookiePolicy = getSessionCookiePolicy();
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookieHeader(cookieHeader);
  return cookies[cookiePolicy.name] ?? null;
}

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days
const DEFAULT_SESSION_COOKIE_NAME = "__Host-cyclop-eddy-session";

export const AUTH_RUNTIME = "nodejs" as const;

export interface AuthConfig {
  sessionTokenPepper: string;
  sessionTtlMs: number;
  sessionCookieName: string;
}

export interface SessionCookiePolicy {
  name: string;
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAgeSeconds: number;
}

function parseSessionTtlSeconds(raw: string | undefined): number {
  if (!raw) {
    return DEFAULT_SESSION_TTL_SECONDS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 60) {
    throw new Error("SESSION_TTL_SECONDS must be an integer >= 60.");
  }

  return parsed;
}

export function getAuthConfig(): AuthConfig {
  const sessionTokenPepper = process.env.SESSION_TOKEN_PEPPER?.trim();
  if (!sessionTokenPepper) {
    throw new Error("Missing required environment variable SESSION_TOKEN_PEPPER.");
  }

  const sessionTtlSeconds = parseSessionTtlSeconds(process.env.SESSION_TTL_SECONDS);

  return {
    sessionTokenPepper,
    sessionTtlMs: sessionTtlSeconds * 1000,
    sessionCookieName: process.env.SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME,
  };
}

export function getSessionCookiePolicy(): SessionCookiePolicy {
  const config = getAuthConfig();

  return {
    name: config.sessionCookieName,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAgeSeconds: Math.floor(config.sessionTtlMs / 1000),
  };
}

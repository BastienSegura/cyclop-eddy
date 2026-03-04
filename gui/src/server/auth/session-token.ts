import { createHash, randomBytes } from "node:crypto";

export const SESSION_TOKEN_BYTES = 32;

export function createSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string, pepper: string): Buffer {
  if (!token) {
    throw new Error("Session token must not be empty.");
  }
  if (!pepper) {
    throw new Error("Session token pepper must not be empty.");
  }

  return createHash("sha256").update(token).update(pepper).digest();
}

export function isSessionExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}

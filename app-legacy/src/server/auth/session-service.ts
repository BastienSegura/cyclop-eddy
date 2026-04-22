import { getAuthConfig } from "./config";
import {
  type SessionCreateInput,
  type SessionRepository,
  prismaSessionRepository,
} from "./session-repository";
import { createSessionToken, hashSessionToken, isSessionExpired } from "./session-token";

export interface SessionMeta {
  userAgent?: string;
  ipHash?: Buffer;
}

export interface CreatedSession {
  token: string;
  sessionId: string;
  userId: string;
  expiresAt: Date;
}

export interface ValidSession {
  sessionId: string;
  userId: string;
  expiresAt: Date;
}

export type RevokeSessionInput =
  | { sessionId: string }
  | { token: string }
  | { tokenHash: Buffer };

export interface SessionService {
  createSession(userId: string, meta?: SessionMeta): Promise<CreatedSession>;
  validateSession(token: string): Promise<ValidSession | null>;
  revokeSession(input: RevokeSessionInput): Promise<void>;
  revokeAllSessionsForUser(userId: string, exceptSessionId?: string): Promise<number>;
}

export interface SessionServiceOptions {
  tokenPepper: string;
  sessionTtlMs: number;
  now?: () => Date;
  generateToken?: () => string;
  repository?: SessionRepository;
}

export function createSessionService(options: SessionServiceOptions): SessionService {
  const now = options.now ?? (() => new Date());
  const repository = options.repository ?? prismaSessionRepository;
  const generateToken = options.generateToken ?? createSessionToken;

  return {
    async createSession(userId, meta) {
      const token = generateToken();
      const tokenHash = hashSessionToken(token, options.tokenPepper);
      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + options.sessionTtlMs);

      const createInput: SessionCreateInput = {
        userId,
        tokenHash,
        expiresAt,
        userAgent: meta?.userAgent,
        ipHash: meta?.ipHash,
      };

      const session = await repository.create(createInput);

      return {
        token,
        sessionId: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      };
    },

    async validateSession(token) {
      const tokenHash = hashSessionToken(token, options.tokenPepper);
      const currentTime = now();
      const session = await repository.findValidByTokenHash(tokenHash, currentTime);

      if (!session) {
        return null;
      }

      if (session.revokedAt || isSessionExpired(session.expiresAt, currentTime)) {
        return null;
      }

      await repository.touchLastSeen(session.id, currentTime);
      return {
        sessionId: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      };
    },

    async revokeSession(input) {
      if ("sessionId" in input) {
        await repository.revokeById(input.sessionId);
        return;
      }

      if ("tokenHash" in input) {
        await repository.revokeByTokenHash(input.tokenHash);
        return;
      }

      const tokenHash = hashSessionToken(input.token, options.tokenPepper);
      await repository.revokeByTokenHash(tokenHash);
    },

    async revokeAllSessionsForUser(userId, exceptSessionId) {
      return repository.revokeAllForUser(userId, exceptSessionId);
    },
  };
}

function getDefaultSessionService(): SessionService {
  const config = getAuthConfig();

  return createSessionService({
    tokenPepper: config.sessionTokenPepper,
    sessionTtlMs: config.sessionTtlMs,
  });
}

export async function createSession(userId: string, meta?: SessionMeta): Promise<CreatedSession> {
  return getDefaultSessionService().createSession(userId, meta);
}

export async function validateSession(token: string): Promise<ValidSession | null> {
  return getDefaultSessionService().validateSession(token);
}

export async function revokeSession(input: RevokeSessionInput): Promise<void> {
  await getDefaultSessionService().revokeSession(input);
}

export async function revokeAllSessionsForUser(
  userId: string,
  exceptSessionId?: string,
): Promise<number> {
  return getDefaultSessionService().revokeAllSessionsForUser(userId, exceptSessionId);
}

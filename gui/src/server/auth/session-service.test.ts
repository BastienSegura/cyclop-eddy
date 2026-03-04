import assert from "node:assert/strict";
import test from "node:test";

import type { Session } from "@prisma/client";

import type { SessionCreateInput, SessionRepository } from "./session-repository";
import { createSessionService } from "./session-service";
import { hashSessionToken, isSessionExpired } from "./session-token";

class InMemorySessionRepository implements SessionRepository {
  private sessions: Session[] = [];

  async create(input: SessionCreateInput): Promise<Session> {
    const session: Session = {
      id: `session-${this.sessions.length + 1}`,
      userId: input.userId,
      tokenHash: Buffer.from(input.tokenHash),
      createdAt: new Date(),
      expiresAt: new Date(input.expiresAt),
      lastSeenAt: null,
      revokedAt: null,
      userAgent: input.userAgent ?? null,
      ipHash: input.ipHash ?? null,
    };

    this.sessions.push(session);
    return session;
  }

  async findValidByTokenHash(tokenHash: Buffer, now: Date): Promise<Session | null> {
    return this.sessions.find((session) => (
      Buffer.compare(Buffer.from(session.tokenHash), tokenHash) === 0
      && session.revokedAt === null
      && session.expiresAt.getTime() > now.getTime()
    )) ?? null;
  }

  async touchLastSeen(sessionId: string, seenAt: Date): Promise<void> {
    const session = this.sessions.find((item) => item.id === sessionId);
    if (session) {
      session.lastSeenAt = new Date(seenAt);
    }
  }

  async revokeById(sessionId: string): Promise<void> {
    const session = this.sessions.find((item) => item.id === sessionId);
    if (session) {
      session.revokedAt = new Date();
    }
  }

  async revokeByTokenHash(tokenHash: Buffer): Promise<void> {
    for (const session of this.sessions) {
      if (Buffer.compare(Buffer.from(session.tokenHash), tokenHash) === 0) {
        session.revokedAt = new Date();
      }
    }
  }

  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<number> {
    let count = 0;

    for (const session of this.sessions) {
      if (session.userId !== userId || session.id === exceptSessionId || session.revokedAt) {
        continue;
      }

      session.revokedAt = new Date();
      count += 1;
    }

    return count;
  }
}

test("createSession stores hashed token and validateSession returns identity", async () => {
  const repository = new InMemorySessionRepository();
  let now = new Date("2026-03-04T12:00:00.000Z");

  const service = createSessionService({
    repository,
    tokenPepper: "pepper-value",
    sessionTtlMs: 60_000,
    now: () => now,
    generateToken: () => "fixed-token",
  });

  const created = await service.createSession("user-1", { userAgent: "unit-test" });
  assert.equal(created.userId, "user-1");
  assert.equal(created.token, "fixed-token");

  const validated = await service.validateSession("fixed-token");
  assert.ok(validated);
  assert.equal(validated?.userId, "user-1");

  now = new Date("2026-03-04T12:05:00.000Z");
  const expired = await service.validateSession("fixed-token");
  assert.equal(expired, null);
});

test("revokeSession supports session id and token variants", async () => {
  const repository = new InMemorySessionRepository();

  const service = createSessionService({
    repository,
    tokenPepper: "pepper-value",
    sessionTtlMs: 60_000,
    generateToken: () => "fixed-token-2",
  });

  const created = await service.createSession("user-2");

  await service.revokeSession({ sessionId: created.sessionId });
  const afterSessionIdRevoke = await service.validateSession(created.token);
  assert.equal(afterSessionIdRevoke, null);

  const createdTwo = await service.createSession("user-2");
  await service.revokeSession({ token: createdTwo.token });
  const afterTokenRevoke = await service.validateSession(createdTwo.token);
  assert.equal(afterTokenRevoke, null);
});

test("hashSessionToken and isSessionExpired primitives are deterministic", () => {
  const token = "token-abc";
  const pepper = "pepper-xyz";

  const firstHash = hashSessionToken(token, pepper);
  const secondHash = hashSessionToken(token, pepper);
  const differentHash = hashSessionToken(token, "another-pepper");

  assert.equal(Buffer.compare(firstHash, secondHash), 0);
  assert.notEqual(Buffer.compare(firstHash, differentHash), 0);

  const now = new Date("2026-03-04T12:00:00.000Z");
  assert.equal(isSessionExpired(new Date("2026-03-04T11:59:59.000Z"), now), true);
  assert.equal(isSessionExpired(new Date("2026-03-04T12:00:01.000Z"), now), false);
});

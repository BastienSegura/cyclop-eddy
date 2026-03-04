import type { Session } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export interface SessionCreateInput {
  userId: string;
  tokenHash: Buffer;
  expiresAt: Date;
  userAgent?: string | null;
  ipHash?: Buffer | null;
}

export interface SessionRepository {
  create(input: SessionCreateInput): Promise<Session>;
  findValidByTokenHash(tokenHash: Buffer, now: Date): Promise<Session | null>;
  touchLastSeen(sessionId: string, seenAt: Date): Promise<void>;
  revokeById(sessionId: string): Promise<void>;
  revokeByTokenHash(tokenHash: Buffer): Promise<void>;
  revokeAllForUser(userId: string, exceptSessionId?: string): Promise<number>;
}

export const prismaSessionRepository: SessionRepository = {
  async create(input) {
    return prisma.session.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent ?? null,
        ipHash: input.ipHash ?? null,
      },
    });
  },

  async findValidByTokenHash(tokenHash, now) {
    return prisma.session.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
    });
  },

  async touchLastSeen(sessionId, seenAt) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastSeenAt: seenAt },
    });
  },

  async revokeById(sessionId) {
    await prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async revokeByTokenHash(tokenHash) {
    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllForUser(userId, exceptSessionId) {
    const result = await prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });

    return result.count;
  },
};

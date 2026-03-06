import type { User } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthConfig, hashPassword, verifyPassword } from "@/server/auth";
import { validateSession } from "@/server/auth/session-service";
import { prisma } from "@/server/db/prisma";
import { parseChangePasswordPayload } from "./change-password";
import { readSessionTokenFromRequest } from "./session-cookie";
import { prismaUserRepository, type UserRepository } from "./user-repository";

export interface PasswordChangeStore {
  updatePasswordAndRevokeOtherSessions(input: {
    userId: string;
    newPasswordHash: string;
    currentSessionId: string;
  }): Promise<number>;
}

export interface ChangePasswordRouteDependencies {
  userRepository: UserRepository;
  validateSessionFn: typeof validateSession;
  verifyPasswordFn: typeof verifyPassword;
  hashPasswordFn: typeof hashPassword;
  passwordChangeStore: PasswordChangeStore;
}

const prismaPasswordChangeStore: PasswordChangeStore = {
  async updatePasswordAndRevokeOtherSessions(input) {
    const [, revokeResult] = await prisma.$transaction([
      prisma.user.update({
        where: { id: input.userId },
        data: { passwordHash: input.newPasswordHash },
      }),
      prisma.session.updateMany({
        where: {
          userId: input.userId,
          revokedAt: null,
          id: { not: input.currentSessionId },
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    return revokeResult.count;
  },
};

function defaultDependencies(): ChangePasswordRouteDependencies {
  return {
    userRepository: prismaUserRepository,
    validateSessionFn: validateSession,
    verifyPasswordFn: verifyPassword,
    hashPasswordFn: hashPassword,
    passwordChangeStore: prismaPasswordChangeStore,
  };
}

async function resolveAuthenticatedUser(
  request: Request,
  dependencies: ChangePasswordRouteDependencies,
): Promise<{ sessionId: string; user: User } | null> {
  const token = readSessionTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const session = await dependencies.validateSessionFn(token);
  if (!session) {
    return null;
  }

  const user = await dependencies.userRepository.findById(session.userId);
  if (!user) {
    return null;
  }

  return {
    sessionId: session.sessionId,
    user,
  };
}

export async function handleChangePasswordRequest(
  request: Request,
  dependencies: ChangePasswordRouteDependencies = defaultDependencies(),
): Promise<Response> {
  try {
    getAuthConfig();
  } catch (error) {
    const baseMessage = "Server auth configuration is incomplete.";
    const details = error instanceof Error ? error.message : "unknown";
    const message = process.env.NODE_ENV === "production" ? baseMessage : `${baseMessage} ${details}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const authenticated = await resolveAuthenticatedUser(request, dependencies);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const parsed = parseChangePasswordPayload(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid change password payload.", issues: parsed.issues }, { status: 400 });
  }

  const isCurrentPasswordValid = await dependencies.verifyPasswordFn(
    parsed.data.currentPassword,
    authenticated.user.passwordHash,
  );
  if (!isCurrentPasswordValid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  try {
    const newPasswordHash = await dependencies.hashPasswordFn(parsed.data.newPassword);
    const revokedSessionCount = await dependencies.passwordChangeStore.updatePasswordAndRevokeOtherSessions({
      userId: authenticated.user.id,
      newPasswordHash,
      currentSessionId: authenticated.sessionId,
    });

    return NextResponse.json(
      {
        ok: true,
        revokedSessionCount,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Password change failed unexpectedly." }, { status: 500 });
  }
}

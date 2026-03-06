import assert from "node:assert/strict";
import test from "node:test";

import type { User } from "@prisma/client";

import { handleChangePasswordRequest } from "@/server/auth/change-password-handler";

class InMemoryUserRepository {
  private users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.id === id) {
        return user;
      }
    }

    return null;
  }

  async findByEmailLower(emailLower: string): Promise<User | null> {
    return this.users.get(emailLower) ?? null;
  }

  async create(input: { email: string; emailLower: string; passwordHash: string }): Promise<User> {
    const user: User = {
      id: `user-${this.users.size + 1}`,
      email: input.email,
      emailLower: input.emailLower,
      passwordHash: input.passwordHash,
      createdAt: new Date("2026-03-04T12:00:00.000Z"),
      updatedAt: new Date("2026-03-04T12:00:00.000Z"),
    };

    this.users.set(input.emailLower, user);
    return user;
  }
}

function buildJsonRequest(payload: unknown, cookieHeader?: string): Request {
  return new Request("http://localhost:3000/api/auth/change-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(payload),
  });
}

test("change password route returns 401 when session is missing", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const response = await handleChangePasswordRequest(buildJsonRequest({
    currentPassword: "OldPassword123",
    newPassword: "NewPassword456",
    confirmPassword: "NewPassword456",
  }));

  assert.equal(response.status, 401);
});

test("change password route returns 400 for invalid payload", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const repository = new InMemoryUserRepository();
  await repository.create({
    email: "user@example.com",
    emailLower: "user@example.com",
    passwordHash: "old-hash",
  });

  const response = await handleChangePasswordRequest(
    buildJsonRequest(
      {
        currentPassword: "",
        newPassword: "short",
        confirmPassword: "different",
      },
      "__Host-cyclop-eddy-session=session-token",
    ),
    {
      userRepository: repository,
      validateSessionFn: async () => ({
        sessionId: "session-1",
        userId: "user-1",
        expiresAt: new Date("2026-03-20T12:00:00.000Z"),
      }),
      verifyPasswordFn: async () => false,
      hashPasswordFn: async () => "should-not-run",
      passwordChangeStore: {
        async updatePasswordAndRevokeOtherSessions() {
          throw new Error("should not update on invalid payload");
        },
      },
    },
  );

  assert.equal(response.status, 400);
});

test("change password route returns 401 for incorrect current password", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const repository = new InMemoryUserRepository();
  await repository.create({
    email: "user@example.com",
    emailLower: "user@example.com",
    passwordHash: "old-hash",
  });

  const response = await handleChangePasswordRequest(
    buildJsonRequest(
      {
        currentPassword: "WrongPassword123",
        newPassword: "NewPassword456",
        confirmPassword: "NewPassword456",
      },
      "__Host-cyclop-eddy-session=session-token",
    ),
    {
      userRepository: repository,
      validateSessionFn: async () => ({
        sessionId: "session-1",
        userId: "user-1",
        expiresAt: new Date("2026-03-20T12:00:00.000Z"),
      }),
      verifyPasswordFn: async () => false,
      hashPasswordFn: async () => "should-not-run",
      passwordChangeStore: {
        async updatePasswordAndRevokeOtherSessions() {
          throw new Error("should not update when current password is invalid");
        },
      },
    },
  );

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error, "Current password is incorrect.");
});

test("change password route updates password and revokes other sessions", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const repository = new InMemoryUserRepository();
  await repository.create({
    email: "user@example.com",
    emailLower: "user@example.com",
    passwordHash: "old-hash",
  });

  let storedNewHash: string | null = null;
  let storedSessionId: string | null = null;
  let storedUserId: string | null = null;

  const response = await handleChangePasswordRequest(
    buildJsonRequest(
      {
        currentPassword: "OldPassword123",
        newPassword: "NewPassword456",
        confirmPassword: "NewPassword456",
      },
      "__Host-cyclop-eddy-session=session-token",
    ),
    {
      userRepository: repository,
      validateSessionFn: async () => ({
        sessionId: "session-1",
        userId: "user-1",
        expiresAt: new Date("2026-03-20T12:00:00.000Z"),
      }),
      verifyPasswordFn: async () => true,
      hashPasswordFn: async (plainPassword) => `hashed:${plainPassword}`,
      passwordChangeStore: {
        async updatePasswordAndRevokeOtherSessions(input) {
          storedNewHash = input.newPasswordHash;
          storedSessionId = input.currentSessionId;
          storedUserId = input.userId;
          return 3;
        },
      },
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.revokedSessionCount, 3);
  assert.equal(storedNewHash, "hashed:NewPassword456");
  assert.equal(storedSessionId, "session-1");
  assert.equal(storedUserId, "user-1");
});

test("change password route returns 500 with actionable message when auth config is missing", async () => {
  delete process.env.SESSION_TOKEN_PEPPER;

  const response = await handleChangePasswordRequest(buildJsonRequest({
    currentPassword: "OldPassword123",
    newPassword: "NewPassword456",
    confirmPassword: "NewPassword456",
  }));

  assert.equal(response.status, 500);
  const body = await response.json();
  assert.match(String(body.error), /Server auth configuration is incomplete/);
});

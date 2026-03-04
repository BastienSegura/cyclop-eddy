import assert from "node:assert/strict";
import test from "node:test";

import type { User } from "@prisma/client";

import type { RegistrationThrottle, ThrottleResult } from "@/server/auth/registration-throttle";
import { handleLoginRequest } from "@/server/auth/login-handler";

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

class TestThrottle implements RegistrationThrottle {
  constructor(private readonly behavior: (key: string) => ThrottleResult) {}

  consume(key: string): ThrottleResult {
    return this.behavior(key);
  }
}

function buildJsonRequest(payload: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}

test("login route authenticates and sets session cookie", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";
  process.env.SESSION_COOKIE_NAME = "__Host-cyclop-eddy-session";

  const repository = new InMemoryUserRepository();
  await repository.create({
    email: "new.user@example.com",
    emailLower: "new.user@example.com",
    passwordHash: "hash-value",
  });

  const response = await handleLoginRequest(
    buildJsonRequest({
      email: "  New.User@Example.com ",
      password: "StrongPassword123",
    }),
    {
      now: () => new Date("2026-03-04T12:00:00.000Z"),
      userRepository: repository,
      loginThrottle: new TestThrottle(() => ({ allowed: true, retryAfterSeconds: 0 })),
      verifyPasswordFn: async () => true,
      createSessionFn: async () => ({
        token: "session-token",
        sessionId: "session-1",
        userId: "user-1",
        expiresAt: new Date("2026-03-18T12:00:00.000Z"),
      }),
    },
  );

  assert.equal(response.status, 200);
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /__Host-cyclop-eddy-session=session-token/);
  assert.match(setCookie, /HttpOnly/i);
});

test("login route returns same 401 error for unknown email and wrong password", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const repository = new InMemoryUserRepository();
  await repository.create({
    email: "existing@example.com",
    emailLower: "existing@example.com",
    passwordHash: "hash-value",
  });

  const unknownEmailResponse = await handleLoginRequest(
    buildJsonRequest({ email: "missing@example.com", password: "whatever123" }),
    {
      now: () => new Date("2026-03-04T12:00:00.000Z"),
      userRepository: repository,
      loginThrottle: new TestThrottle(() => ({ allowed: true, retryAfterSeconds: 0 })),
      verifyPasswordFn: async () => false,
      createSessionFn: async () => {
        throw new Error("session should not be created");
      },
    },
  );

  const wrongPasswordResponse = await handleLoginRequest(
    buildJsonRequest({ email: "existing@example.com", password: "wrong-pass" }),
    {
      now: () => new Date("2026-03-04T12:00:00.000Z"),
      userRepository: repository,
      loginThrottle: new TestThrottle(() => ({ allowed: true, retryAfterSeconds: 0 })),
      verifyPasswordFn: async () => false,
      createSessionFn: async () => {
        throw new Error("session should not be created");
      },
    },
  );

  assert.equal(unknownEmailResponse.status, 401);
  assert.equal(wrongPasswordResponse.status, 401);

  const unknownBody = await unknownEmailResponse.json();
  const wrongBody = await wrongPasswordResponse.json();
  assert.equal(unknownBody.error, wrongBody.error);
});

test("login route returns 400 for invalid payload", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const response = await handleLoginRequest(
    buildJsonRequest({ email: "not-an-email", password: "" }),
    {
      now: () => new Date("2026-03-04T12:00:00.000Z"),
      userRepository: new InMemoryUserRepository(),
      loginThrottle: new TestThrottle(() => ({ allowed: true, retryAfterSeconds: 0 })),
      verifyPasswordFn: async () => false,
      createSessionFn: async () => {
        throw new Error("session should not be created");
      },
    },
  );

  assert.equal(response.status, 400);
});

test("login route returns 429 when throttled", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const response = await handleLoginRequest(
    buildJsonRequest({ email: "user@example.com", password: "Secret123" }),
    {
      now: () => new Date("2026-03-04T12:00:00.000Z"),
      userRepository: new InMemoryUserRepository(),
      loginThrottle: new TestThrottle((key) => {
        if (key.startsWith("login:ip:")) {
          return { allowed: false, retryAfterSeconds: 60 };
        }

        return { allowed: true, retryAfterSeconds: 0 };
      }),
      verifyPasswordFn: async () => false,
      createSessionFn: async () => {
        throw new Error("session should not be created");
      },
    },
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
});

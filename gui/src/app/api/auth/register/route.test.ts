import assert from "node:assert/strict";
import test from "node:test";

import type { User } from "@prisma/client";

import type { RegistrationThrottle, ThrottleResult } from "@/server/auth/registration-throttle";
import { handleRegisterRequest } from "./route";

class InMemoryUserRepository {
  private users = new Map<string, User>();

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
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}

test("register route creates user and sets session cookie", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";
  process.env.SESSION_COOKIE_NAME = "__Host-cyclop-eddy-session";

  const repository = new InMemoryUserRepository();

  const response = await handleRegisterRequest(
    buildJsonRequest(
      {
        email: "  New.User@Example.com  ",
        password: "StrongPassword123",
        confirmPassword: "StrongPassword123",
      },
      { "x-forwarded-for": "192.168.1.10" },
    ),
    {
      now: () => new Date("2026-03-04T12:00:00.000Z"),
      userRepository: repository,
      registrationThrottle: new TestThrottle(() => ({ allowed: true, retryAfterSeconds: 0 })),
      hashPasswordFn: async () => "hashed-password",
      createSessionFn: async () => ({
        token: "session-token",
        sessionId: "session-1",
        userId: "user-1",
        expiresAt: new Date("2026-03-18T12:00:00.000Z"),
      }),
    },
  );

  assert.equal(response.status, 201);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.user.email, "New.User@Example.com");

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /__Host-cyclop-eddy-session=session-token/);
  assert.match(setCookie, /HttpOnly/i);
});

test("register route returns 409 for duplicate normalized email", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const repository = new InMemoryUserRepository();
  await repository.create({
    email: "existing@example.com",
    emailLower: "existing@example.com",
    passwordHash: "hash",
  });

  const response = await handleRegisterRequest(
    buildJsonRequest({
      email: "Existing@Example.com",
      password: "StrongPassword123",
      confirmPassword: "StrongPassword123",
    }),
    {
      now: () => new Date("2026-03-04T12:00:00.000Z"),
      userRepository: repository,
      registrationThrottle: new TestThrottle(() => ({ allowed: true, retryAfterSeconds: 0 })),
      hashPasswordFn: async () => "hashed-password",
      createSessionFn: async () => {
        throw new Error("should not create session for duplicate");
      },
    },
  );

  assert.equal(response.status, 409);
});

test("register route returns 400 for invalid payload", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const response = await handleRegisterRequest(
    buildJsonRequest({
      email: "bad-email",
      password: "weak",
      confirmPassword: "not-match",
    }),
    {
      now: () => new Date("2026-03-04T12:00:00.000Z"),
      userRepository: new InMemoryUserRepository(),
      registrationThrottle: new TestThrottle(() => ({ allowed: true, retryAfterSeconds: 0 })),
      hashPasswordFn: async () => "hashed-password",
      createSessionFn: async () => {
        throw new Error("should not create session for invalid payload");
      },
    },
  );

  assert.equal(response.status, 400);
});

test("register route returns 429 and retry-after when throttled", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const response = await handleRegisterRequest(
    buildJsonRequest({
      email: "user@example.com",
      password: "StrongPassword123",
      confirmPassword: "StrongPassword123",
    }),
    {
      now: () => new Date("2026-03-04T12:00:00.000Z"),
      userRepository: new InMemoryUserRepository(),
      registrationThrottle: new TestThrottle((key) => {
        if (key.startsWith("register:ip:")) {
          return { allowed: false, retryAfterSeconds: 120 };
        }

        return { allowed: true, retryAfterSeconds: 0 };
      }),
      hashPasswordFn: async () => "hashed-password",
      createSessionFn: async () => {
        throw new Error("should not create session when throttled");
      },
    },
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "120");
});

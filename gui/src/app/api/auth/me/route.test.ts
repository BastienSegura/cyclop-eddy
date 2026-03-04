import assert from "node:assert/strict";
import test from "node:test";

import { handleMeRequest } from "@/server/auth/me-handler";

function buildRequest(cookieHeader?: string): Request {
  return new Request("http://localhost:3000/api/auth/me", {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

test("me route returns 401 when session cookie is missing", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  let resolverCalled = false;

  const response = await handleMeRequest(
    buildRequest(),
    {
      resolveSessionUserFromTokenFn: async () => {
        resolverCalled = true;
        return null;
      },
    },
  );

  assert.equal(response.status, 401);
  assert.equal(resolverCalled, false);
});

test("me route returns 401 for invalid session", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const response = await handleMeRequest(
    buildRequest("__Host-cyclop-eddy-session=bad-token"),
    {
      resolveSessionUserFromTokenFn: async () => null,
    },
  );

  assert.equal(response.status, 401);
});

test("me route returns authenticated user profile when session is valid", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  const response = await handleMeRequest(
    buildRequest("__Host-cyclop-eddy-session=valid-token"),
    {
      resolveSessionUserFromTokenFn: async (token) => {
        assert.equal(token, "valid-token");
        return {
          id: "user-1",
          email: "user@example.com",
        };
      },
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.authenticated, true);
  assert.equal(body.user.email, "user@example.com");
});

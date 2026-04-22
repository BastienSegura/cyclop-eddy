import assert from "node:assert/strict";
import test from "node:test";

import { handleLogoutRequest } from "@/server/auth/logout-handler";

function buildRequest(cookieHeader?: string): Request {
  return new Request("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

test("logout route revokes current session and clears cookie", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";
  process.env.SESSION_COOKIE_NAME = "__Host-cyclop-eddy-session";

  let revokedToken: string | null = null;

  const response = await handleLogoutRequest(
    buildRequest("__Host-cyclop-eddy-session=token-abc"),
    {
      revokeSessionFn: async (input) => {
        if ("token" in input) {
          revokedToken = input.token;
        }
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(revokedToken, "token-abc");

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /__Host-cyclop-eddy-session=/);
  assert.match(setCookie, /Max-Age=0/);
});

test("logout route succeeds even when no session cookie exists", async () => {
  process.env.SESSION_TOKEN_PEPPER = "test-pepper";

  let revokeCalled = false;

  const response = await handleLogoutRequest(
    buildRequest(),
    {
      revokeSessionFn: async () => {
        revokeCalled = true;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(revokeCalled, false);
});

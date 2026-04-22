import assert from "node:assert/strict";
import test from "node:test";

import { parseLoginPayload } from "./login";

test("parseLoginPayload normalizes email and accepts valid payload", () => {
  const parsed = parseLoginPayload({
    email: "  User.Name@Example.COM  ",
    password: "TopSecret123",
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    throw new Error("expected successful parse result");
  }

  assert.equal(parsed.data.email, "User.Name@Example.COM");
  assert.equal(parsed.data.emailLower, "user.name@example.com");
});

test("parseLoginPayload rejects malformed payload", () => {
  const parsed = parseLoginPayload({
    email: "invalid-email",
    password: "",
  });

  assert.equal(parsed.ok, false);
  if (parsed.ok) {
    throw new Error("expected failed parse result");
  }

  const issueFields = new Set(parsed.issues.map((issue) => issue.field));
  assert.equal(issueFields.has("email"), true);
  assert.equal(issueFields.has("password"), true);
});

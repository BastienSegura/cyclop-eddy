import assert from "node:assert/strict";
import test from "node:test";

import { parseRegistrationPayload } from "./registration";

test("parseRegistrationPayload normalizes email and accepts valid payload", () => {
  const parsed = parseRegistrationPayload({
    email: "  User.Name@Example.COM  ",
    password: "ValidPassword123",
    confirmPassword: "ValidPassword123",
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    throw new Error("expected successful parse result");
  }

  assert.equal(parsed.data.email, "User.Name@Example.COM");
  assert.equal(parsed.data.emailLower, "user.name@example.com");
});

test("parseRegistrationPayload rejects weak password and mismatched confirmation", () => {
  const parsed = parseRegistrationPayload({
    email: "user@example.com",
    password: "weak",
    confirmPassword: "different",
  });

  assert.equal(parsed.ok, false);
  if (parsed.ok) {
    throw new Error("expected failed parse result");
  }

  const issueFields = new Set(parsed.issues.map((issue) => issue.field));
  assert.equal(issueFields.has("password"), true);
  assert.equal(issueFields.has("confirmPassword"), true);
});

import assert from "node:assert/strict";
import test from "node:test";

import { parseChangePasswordPayload } from "./change-password";

test("parseChangePasswordPayload accepts a valid payload", () => {
  const parsed = parseChangePasswordPayload({
    currentPassword: "CurrentPassword123",
    newPassword: "NewPassword456",
    confirmPassword: "NewPassword456",
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    throw new Error("expected successful parse result");
  }

  assert.equal(parsed.data.currentPassword, "CurrentPassword123");
  assert.equal(parsed.data.newPassword, "NewPassword456");
});

test("parseChangePasswordPayload rejects weak, mismatched, and identical passwords", () => {
  const parsed = parseChangePasswordPayload({
    currentPassword: "SamePassword123",
    newPassword: "SamePassword123",
    confirmPassword: "DifferentPassword123",
  });

  assert.equal(parsed.ok, false);
  if (parsed.ok) {
    throw new Error("expected failed parse result");
  }

  const issueFields = new Set(parsed.issues.map((issue) => issue.field));
  assert.equal(issueFields.has("newPassword"), true);
  assert.equal(issueFields.has("confirmPassword"), true);
});

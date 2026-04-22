import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, verifyPassword } from "./password";

test("hashPassword and verifyPassword round-trip", async () => {
  const hashed = await hashPassword("CorrectHorseBatteryStaple42!");

  assert.notEqual(hashed, "CorrectHorseBatteryStaple42!");
  assert.equal(await verifyPassword("CorrectHorseBatteryStaple42!", hashed), true);
  assert.equal(await verifyPassword("wrong-password", hashed), false);
});

test("hashPassword rejects blank passwords", async () => {
  await assert.rejects(async () => {
    await hashPassword("   ");
  }, /must not be empty/);
});

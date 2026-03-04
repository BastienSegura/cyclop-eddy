import { Algorithm, hash, verify } from "@node-rs/argon2";

const PASSWORD_HASH_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

function assertNonEmptyPassword(password: string): void {
  if (!password || !password.trim()) {
    throw new Error("Password must not be empty.");
  }
}

export async function hashPassword(plainPassword: string): Promise<string> {
  assertNonEmptyPassword(plainPassword);
  return hash(plainPassword, PASSWORD_HASH_OPTIONS);
}

export async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  assertNonEmptyPassword(plainPassword);
  return verify(passwordHash, plainPassword, PASSWORD_HASH_OPTIONS);
}

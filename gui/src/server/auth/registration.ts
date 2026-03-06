import { validatePasswordStrength } from "./password-policy";

const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationField = "payload" | "email" | "password" | "confirmPassword";

export interface ValidationIssue {
  field: ValidationField;
  message: string;
}

export interface RegistrationInput {
  email: string;
  emailLower: string;
  password: string;
}

export interface RegistrationPayload {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ParseRegistrationSuccess {
  ok: true;
  data: RegistrationInput;
}

export interface ParseRegistrationFailure {
  ok: false;
  issues: ValidationIssue[];
}

export type ParseRegistrationResult = ParseRegistrationSuccess | ParseRegistrationFailure;

function normalizeEmail(email: string): { email: string; emailLower: string } {
  const trimmed = email.trim();
  return {
    email: trimmed,
    emailLower: trimmed.toLowerCase(),
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseRegistrationPayload(raw: unknown): ParseRegistrationResult {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      issues: [{ field: "payload", message: "Payload must be a JSON object." }],
    };
  }

  const payload = raw as Partial<RegistrationPayload>;
  const emailRaw = asString(payload.email);
  const password = asString(payload.password);
  const confirmPassword = asString(payload.confirmPassword);

  const { email, emailLower } = normalizeEmail(emailRaw);
  const issues: ValidationIssue[] = [];

  if (!email) {
    issues.push({ field: "email", message: "Email is required." });
  } else {
    if (email.length > MAX_EMAIL_LENGTH) {
      issues.push({ field: "email", message: `Email must be at most ${MAX_EMAIL_LENGTH} characters.` });
    }

    if (!EMAIL_PATTERN.test(email)) {
      issues.push({ field: "email", message: "Email format is invalid." });
    }
  }

  issues.push(...validatePasswordStrength(password, "password"));

  if (!confirmPassword) {
    issues.push({ field: "confirmPassword", message: "Password confirmation is required." });
  } else if (password !== confirmPassword) {
    issues.push({ field: "confirmPassword", message: "Password confirmation does not match." });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    data: {
      email,
      emailLower,
      password,
    },
  };
}

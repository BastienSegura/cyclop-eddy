const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationField = "payload" | "email" | "password";

export interface ValidationIssue {
  field: ValidationField;
  message: string;
}

export interface LoginInput {
  email: string;
  emailLower: string;
  password: string;
}

export interface ParseLoginSuccess {
  ok: true;
  data: LoginInput;
}

export interface ParseLoginFailure {
  ok: false;
  issues: ValidationIssue[];
}

export type ParseLoginResult = ParseLoginSuccess | ParseLoginFailure;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseLoginPayload(raw: unknown): ParseLoginResult {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      issues: [{ field: "payload", message: "Payload must be a JSON object." }],
    };
  }

  const payload = raw as Partial<{ email: string; password: string }>;
  const email = asString(payload.email).trim();
  const emailLower = email.toLowerCase();
  const password = asString(payload.password);

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

  if (!password) {
    issues.push({ field: "password", message: "Password is required." });
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

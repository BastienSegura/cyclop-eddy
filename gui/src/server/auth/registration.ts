const MIN_PASSWORD_LENGTH = 12;
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

function hasUppercase(text: string): boolean {
  return /[A-Z]/.test(text);
}

function hasLowercase(text: string): boolean {
  return /[a-z]/.test(text);
}

function hasDigit(text: string): boolean {
  return /[0-9]/.test(text);
}

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

  if (!password) {
    issues.push({ field: "password", message: "Password is required." });
  } else {
    if (password.length < MIN_PASSWORD_LENGTH) {
      issues.push({ field: "password", message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    if (!hasUppercase(password)) {
      issues.push({ field: "password", message: "Password must include at least one uppercase letter." });
    }
    if (!hasLowercase(password)) {
      issues.push({ field: "password", message: "Password must include at least one lowercase letter." });
    }
    if (!hasDigit(password)) {
      issues.push({ field: "password", message: "Password must include at least one number." });
    }
  }

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

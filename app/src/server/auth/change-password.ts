import { validatePasswordStrength } from "./password-policy";

type ValidationField = "payload" | "currentPassword" | "newPassword" | "confirmPassword";

export interface ValidationIssue {
  field: ValidationField;
  message: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ParseChangePasswordSuccess {
  ok: true;
  data: ChangePasswordInput;
}

export interface ParseChangePasswordFailure {
  ok: false;
  issues: ValidationIssue[];
}

export type ParseChangePasswordResult =
  | ParseChangePasswordSuccess
  | ParseChangePasswordFailure;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseChangePasswordPayload(raw: unknown): ParseChangePasswordResult {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      issues: [{ field: "payload", message: "Payload must be a JSON object." }],
    };
  }

  const payload = raw as Partial<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>;

  const currentPassword = asString(payload.currentPassword);
  const newPassword = asString(payload.newPassword);
  const confirmPassword = asString(payload.confirmPassword);

  const issues: ValidationIssue[] = [];

  if (!currentPassword) {
    issues.push({ field: "currentPassword", message: "Current password is required." });
  }

  issues.push(...validatePasswordStrength(newPassword, "newPassword"));

  if (!confirmPassword) {
    issues.push({ field: "confirmPassword", message: "Password confirmation is required." });
  } else if (newPassword !== confirmPassword) {
    issues.push({ field: "confirmPassword", message: "Password confirmation does not match." });
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    issues.push({ field: "newPassword", message: "New password must be different from current password." });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    data: {
      currentPassword,
      newPassword,
    },
  };
}

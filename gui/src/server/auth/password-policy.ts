export const MIN_PASSWORD_LENGTH = 12;

export interface PasswordValidationIssue<Field extends string = string> {
  field: Field;
  message: string;
}

function hasUppercase(text: string): boolean {
  return /[A-Z]/.test(text);
}

function hasLowercase(text: string): boolean {
  return /[a-z]/.test(text);
}

function hasDigit(text: string): boolean {
  return /[0-9]/.test(text);
}

export function validatePasswordStrength<Field extends string>(
  password: string,
  field: Field,
): PasswordValidationIssue<Field>[] {
  const issues: PasswordValidationIssue<Field>[] = [];

  if (!password) {
    issues.push({ field, message: "Password is required." });
    return issues;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    issues.push({ field, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  if (!hasUppercase(password)) {
    issues.push({ field, message: "Password must include at least one uppercase letter." });
  }
  if (!hasLowercase(password)) {
    issues.push({ field, message: "Password must include at least one lowercase letter." });
  }
  if (!hasDigit(password)) {
    issues.push({ field, message: "Password must include at least one number." });
  }

  return issues;
}

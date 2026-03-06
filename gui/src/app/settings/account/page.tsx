"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

interface FormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ValidationIssue {
  field: string;
  message: string;
}

interface ChangePasswordApiError {
  error?: string;
  issues?: ValidationIssue[];
}

const INITIAL_FORM_STATE: FormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function AccountSettingsPage() {
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canSubmit = useMemo(
    () => formState.currentPassword && formState.newPassword && formState.confirmPassword,
    [formState],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isSubmitting || !canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as ChangePasswordApiError | null;
        const issueMessage = errorPayload?.issues?.[0]?.message;
        const fallback = response.status === 401
          ? "You must be logged in with your current password to change it."
          : "Unable to change password.";
        setErrorMessage(issueMessage || errorPayload?.error || fallback);
        return;
      }

      setFormState(INITIAL_FORM_STATE);
      setSuccessMessage("Password updated. Other active sessions were revoked.");
    } catch {
      setErrorMessage("Unexpected network error while changing password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page-shell">
      <section className="auth-card">
        <h1>Account Settings</h1>
        <p>Change your password. Other active sessions will be signed out after a successful update.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={formState.currentPassword}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setFormState((prev) => ({ ...prev, currentPassword: nextValue }));
            }}
            required
          />

          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={formState.newPassword}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setFormState((prev) => ({ ...prev, newPassword: nextValue }));
            }}
            required
          />

          <label htmlFor="confirm-new-password">Confirm new password</label>
          <input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            value={formState.confirmPassword}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setFormState((prev) => ({ ...prev, confirmPassword: nextValue }));
            }}
            required
          />

          <button type="submit" className="primary-button" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Updating password..." : "Change password"}
          </button>
        </form>

        {errorMessage ? <p className="auth-feedback auth-feedback-error">{errorMessage}</p> : null}
        {successMessage ? <p className="auth-feedback auth-feedback-success">{successMessage}</p> : null}

        <p className="auth-page-link">
          <Link href="/">Back to graph</Link>
        </p>
      </section>
    </main>
  );
}

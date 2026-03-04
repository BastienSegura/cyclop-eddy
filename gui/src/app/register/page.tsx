"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
}

interface ValidationIssue {
  field: string;
  message: string;
}

interface RegisterApiError {
  error?: string;
  issues?: ValidationIssue[];
}

const INITIAL_FORM_STATE: FormState = {
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(
    () => formState.email.trim() && formState.password && formState.confirmPassword,
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as RegisterApiError | null;
        const issueMessage = errorPayload?.issues?.[0]?.message;
        const fallback = response.status === 429
          ? "Too many attempts. Please try again soon."
          : "Unable to create your account.";
        setErrorMessage(issueMessage || errorPayload?.error || fallback);
        return;
      }

      setSuccessMessage("Account created. Redirecting...");
      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage("Unexpected network error while creating account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page-shell">
      <section className="auth-card">
        <h1>Create Account</h1>
        <p>Register to save and restore your exploration progress.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={formState.email}
            onChange={(event) => setFormState((prev) => ({ ...prev, email: event.currentTarget.value }))}
            required
          />

          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={formState.password}
            onChange={(event) => setFormState((prev) => ({ ...prev, password: event.currentTarget.value }))}
            required
          />

          <label htmlFor="register-confirm-password">Confirm password</label>
          <input
            id="register-confirm-password"
            type="password"
            autoComplete="new-password"
            value={formState.confirmPassword}
            onChange={(event) => setFormState((prev) => ({ ...prev, confirmPassword: event.currentTarget.value }))}
            required
          />

          <button type="submit" className="primary-button" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        {errorMessage ? <p className="auth-feedback auth-feedback-error">{errorMessage}</p> : null}
        {successMessage ? <p className="auth-feedback auth-feedback-success">{successMessage}</p> : null}

        <p className="auth-page-footnote">
          Login page is planned next. For now registration automatically signs you in.
        </p>

        <p className="auth-page-link">
          <Link href="/">Back to graph</Link>
        </p>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

interface FormState {
  email: string;
  password: string;
}

interface ValidationIssue {
  field: string;
  message: string;
}

interface LoginApiError {
  error?: string;
  issues?: ValidationIssue[];
}

const INITIAL_FORM_STATE: FormState = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(
    () => formState.email.trim() && formState.password,
    [formState],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isSubmitting || !canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as LoginApiError | null;
        const issueMessage = errorPayload?.issues?.[0]?.message;
        const fallback = response.status === 429
          ? "Too many attempts. Please try again soon."
          : "Unable to sign in.";
        setErrorMessage(issueMessage || errorPayload?.error || fallback);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage("Unexpected network error while signing in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page-shell">
      <section className="auth-card">
        <h1>Login</h1>
        <p>Sign in to continue your exploration progress.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={formState.email}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setFormState((prev) => ({ ...prev, email: nextValue }));
            }}
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={formState.password}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setFormState((prev) => ({ ...prev, password: nextValue }));
            }}
            required
          />

          <button type="submit" className="primary-button" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {errorMessage ? <p className="auth-feedback auth-feedback-error">{errorMessage}</p> : null}

        <p className="auth-page-link">
          Need an account? <Link href="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}

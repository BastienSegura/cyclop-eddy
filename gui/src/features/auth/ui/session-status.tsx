"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SessionUser {
  id: string;
  email: string;
}

interface MeResponse {
  authenticated?: boolean;
  user?: SessionUser;
}

type SessionState =
  | { status: "loading"; user: null }
  | { status: "ready"; user: SessionUser | null }
  | { status: "error"; user: null };

export function SessionStatus() {
  const [state, setState] = useState<SessionState>({ status: "loading", user: null });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function run(): Promise<void> {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            setState({ status: "ready", user: null });
            return;
          }

          setState({ status: "error", user: null });
          return;
        }

        const payload = (await response.json()) as MeResponse;
        if (payload.authenticated && payload.user) {
          setState({ status: "ready", user: payload.user });
          return;
        }

        setState({ status: "ready", user: null });
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setState({ status: "error", user: null });
      }
    }

    run();

    return () => controller.abort();
  }, []);

  async function handleLogout(): Promise<void> {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      setState({ status: "ready", user: null });
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (state.status === "loading") {
    return <span className="session-status-pending">Session...</span>;
  }

  if (state.status === "error") {
    return (
      <div className="session-status session-status-error">
        <Link href="/login">Login</Link>
      </div>
    );
  }

  if (!state.user) {
    return (
      <div className="session-status">
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
      </div>
    );
  }

  return (
    <div className="session-status session-status-authenticated">
      <span title={state.user.email}>{state.user.email}</span>
      <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
        {isLoggingOut ? "Logging out..." : "Logout"}
      </button>
    </div>
  );
}

import { NextResponse } from "next/server";

import { getAuthConfig, getSessionCookiePolicy, revokeSession } from "@/server/auth";
import { readSessionTokenFromRequest } from "./session-cookie";

export interface LogoutRouteDependencies {
  revokeSessionFn: typeof revokeSession;
}

function defaultDependencies(): LogoutRouteDependencies {
  return {
    revokeSessionFn: revokeSession,
  };
}

export async function handleLogoutRequest(
  request: Request,
  dependencies: LogoutRouteDependencies = defaultDependencies(),
): Promise<Response> {
  let cookiePolicy: ReturnType<typeof getSessionCookiePolicy>;
  try {
    getAuthConfig();
    cookiePolicy = getSessionCookiePolicy();
  } catch (error) {
    const baseMessage = "Server auth configuration is incomplete.";
    const details = error instanceof Error ? error.message : "unknown";
    const message = process.env.NODE_ENV === "production" ? baseMessage : `${baseMessage} ${details}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const token = readSessionTokenFromRequest(request);
  if (token) {
    await dependencies.revokeSessionFn({ token });
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set({
    name: cookiePolicy.name,
    value: "",
    httpOnly: cookiePolicy.httpOnly,
    sameSite: cookiePolicy.sameSite,
    path: cookiePolicy.path,
    secure: cookiePolicy.secure,
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

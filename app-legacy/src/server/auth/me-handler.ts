import { NextResponse } from "next/server";

import { getAuthConfig } from "@/server/auth";
import {
  resolveSessionUserFromToken,
  type SessionUser,
} from "./current-user";
import { readSessionTokenFromRequest } from "./session-cookie";

interface MeRouteDependencies {
  resolveSessionUserFromTokenFn: (token: string) => Promise<SessionUser | null>;
}

function defaultDependencies(): MeRouteDependencies {
  return {
    resolveSessionUserFromTokenFn: resolveSessionUserFromToken,
  };
}

export async function handleMeRequest(
  request: Request,
  dependencies: MeRouteDependencies = defaultDependencies(),
): Promise<Response> {
  try {
    getAuthConfig();
  } catch (error) {
    const baseMessage = "Server auth configuration is incomplete.";
    const details = error instanceof Error ? error.message : "unknown";
    const message = process.env.NODE_ENV === "production" ? baseMessage : `${baseMessage} ${details}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const token = readSessionTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await dependencies.resolveSessionUserFromTokenFn(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(
    {
      authenticated: true,
      user,
    },
    { status: 200 },
  );
}

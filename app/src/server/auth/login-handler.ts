import { NextResponse } from "next/server";

import { createSession } from "@/server/auth/session-service";
import { getAuthConfig, getSessionCookiePolicy, verifyPassword } from "@/server/auth";
import { parseLoginPayload } from "./login";
import { defaultLoginThrottle } from "./login-throttle";
import { prismaUserRepository, type UserRepository } from "./user-repository";
import type { RegistrationThrottle } from "./registration-throttle";

const INVALID_CREDENTIALS_ERROR = "Invalid email or password.";

export interface LoginRouteDependencies {
  now: () => Date;
  userRepository: UserRepository;
  loginThrottle: RegistrationThrottle;
  verifyPasswordFn: typeof verifyPassword;
  createSessionFn: typeof createSession;
}

function defaultDependencies(): LoginRouteDependencies {
  return {
    now: () => new Date(),
    userRepository: prismaUserRepository,
    loginThrottle: defaultLoginThrottle,
    verifyPasswordFn: verifyPassword,
    createSessionFn: createSession,
  };
}

function tooManyRequestsResponse(retryAfterSeconds: number): NextResponse {
  const response = NextResponse.json(
    { error: "Too many login attempts. Please try again later." },
    { status: 429 },
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

async function resolvePayload(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function handleLoginRequest(
  request: Request,
  dependencies: LoginRouteDependencies = defaultDependencies(),
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

  const now = dependencies.now();
  const ip = getClientIp(request.headers);

  const ipDecision = dependencies.loginThrottle.consume(`login:ip:${ip}`, now);
  if (!ipDecision.allowed) {
    return tooManyRequestsResponse(ipDecision.retryAfterSeconds);
  }

  const payload = await resolvePayload(request);
  const parsed = parseLoginPayload(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid login payload.", issues: parsed.issues }, { status: 400 });
  }

  const emailDecision = dependencies.loginThrottle.consume(`login:email:${parsed.data.emailLower}`, now);
  if (!emailDecision.allowed) {
    return tooManyRequestsResponse(emailDecision.retryAfterSeconds);
  }

  try {
    const user = await dependencies.userRepository.findByEmailLower(parsed.data.emailLower);
    if (!user) {
      return NextResponse.json({ error: INVALID_CREDENTIALS_ERROR }, { status: 401 });
    }

    const isPasswordValid = await dependencies.verifyPasswordFn(parsed.data.password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: INVALID_CREDENTIALS_ERROR }, { status: 401 });
    }

    const session = await dependencies.createSessionFn(user.id, {
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    const response = NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 200 },
    );

    response.cookies.set({
      name: cookiePolicy.name,
      value: session.token,
      httpOnly: cookiePolicy.httpOnly,
      sameSite: cookiePolicy.sameSite,
      path: cookiePolicy.path,
      secure: cookiePolicy.secure,
      maxAge: cookiePolicy.maxAgeSeconds,
      expires: session.expiresAt,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Login failed unexpectedly." }, { status: 500 });
  }
}

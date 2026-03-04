import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { AUTH_RUNTIME, getSessionCookiePolicy, hashPassword } from "@/server/auth";
import { createSession } from "@/server/auth/session-service";
import {
  defaultRegistrationThrottle,
  type RegistrationThrottle,
} from "@/server/auth/registration-throttle";
import { parseRegistrationPayload } from "@/server/auth/registration";
import { prismaUserRepository, type UserRepository } from "@/server/auth/user-repository";

export const runtime = AUTH_RUNTIME;

interface RegisterRouteDependencies {
  now: () => Date;
  userRepository: UserRepository;
  registrationThrottle: RegistrationThrottle;
  hashPasswordFn: typeof hashPassword;
  createSessionFn: typeof createSession;
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

function tooManyRequestsResponse(retryAfterSeconds: number): NextResponse {
  const response = NextResponse.json(
    { error: "Too many registration attempts. Please try again later." },
    { status: 429 },
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

async function resolvePayload(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function buildDependencies(): RegisterRouteDependencies {
  return {
    now: () => new Date(),
    userRepository: prismaUserRepository,
    registrationThrottle: defaultRegistrationThrottle,
    hashPasswordFn: hashPassword,
    createSessionFn: createSession,
  };
}

export async function handleRegisterRequest(
  request: Request,
  dependencies: RegisterRouteDependencies = buildDependencies(),
): Promise<Response> {
  const now = dependencies.now();
  const ip = getClientIp(request.headers);

  const ipDecision = dependencies.registrationThrottle.consume(`register:ip:${ip}`, now);
  if (!ipDecision.allowed) {
    return tooManyRequestsResponse(ipDecision.retryAfterSeconds);
  }

  const payload = await resolvePayload(request);
  const parsed = parseRegistrationPayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid registration payload.", issues: parsed.issues }, { status: 400 });
  }

  const emailDecision = dependencies.registrationThrottle.consume(
    `register:email:${parsed.data.emailLower}`,
    now,
  );
  if (!emailDecision.allowed) {
    return tooManyRequestsResponse(emailDecision.retryAfterSeconds);
  }

  try {
    const existing = await dependencies.userRepository.findByEmailLower(parsed.data.emailLower);
    if (existing) {
      return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    }

    const passwordHash = await dependencies.hashPasswordFn(parsed.data.password);
    const user = await dependencies.userRepository.create({
      email: parsed.data.email,
      emailLower: parsed.data.emailLower,
      passwordHash,
    });

    const session = await dependencies.createSessionFn(user.id, {
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    const cookiePolicy = getSessionCookiePolicy();

    const response = NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 201 },
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    }

    return NextResponse.json({ error: "Registration failed unexpectedly." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleRegisterRequest(request);
}

import { validateSession } from "@/server/auth/session-service";
import { prismaUserRepository, type UserRepository } from "./user-repository";
import { readSessionTokenFromRequest } from "./session-cookie";

export interface SessionUser {
  id: string;
  email: string;
}

interface CurrentUserDependencies {
  validateSessionFn: typeof validateSession;
  userRepository: UserRepository;
}

export interface AuthenticatedSessionUser {
  sessionId: string;
  user: SessionUser;
}

function defaultDependencies(): CurrentUserDependencies {
  return {
    validateSessionFn: validateSession,
    userRepository: prismaUserRepository,
  };
}

export async function resolveSessionUserFromToken(
  token: string,
  dependencies: CurrentUserDependencies = defaultDependencies(),
): Promise<SessionUser | null> {
  const authenticated = await resolveAuthenticatedSessionUserFromToken(token, dependencies);
  return authenticated?.user ?? null;
}

export async function resolveAuthenticatedSessionUserFromToken(
  token: string,
  dependencies: CurrentUserDependencies = defaultDependencies(),
): Promise<AuthenticatedSessionUser | null> {
  const session = await dependencies.validateSessionFn(token);
  if (!session) {
    return null;
  }

  const user = await dependencies.userRepository.findById(session.userId);
  if (!user) {
    return null;
  }

  return {
    sessionId: session.sessionId,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

export async function resolveSessionUserFromRequest(
  request: Request,
  dependencies: CurrentUserDependencies = defaultDependencies(),
): Promise<SessionUser | null> {
  const authenticated = await resolveAuthenticatedSessionUserFromRequest(request, dependencies);
  return authenticated?.user ?? null;
}

export async function resolveAuthenticatedSessionUserFromRequest(
  request: Request,
  dependencies: CurrentUserDependencies = defaultDependencies(),
): Promise<AuthenticatedSessionUser | null> {
  const token = readSessionTokenFromRequest(request);
  if (!token) {
    return null;
  }

  return resolveAuthenticatedSessionUserFromToken(token, dependencies);
}

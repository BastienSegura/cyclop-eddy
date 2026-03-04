import { AUTH_RUNTIME } from "@/server/auth";
import { handleLoginRequest } from "@/server/auth/login-handler";

export const runtime = AUTH_RUNTIME;

export async function POST(request: Request): Promise<Response> {
  return handleLoginRequest(request);
}

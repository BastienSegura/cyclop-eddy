import { AUTH_RUNTIME } from "@/server/auth";
import { handleRegisterRequest } from "@/server/auth/register-handler";

export const runtime = AUTH_RUNTIME;

export async function POST(request: Request): Promise<Response> {
  return handleRegisterRequest(request);
}

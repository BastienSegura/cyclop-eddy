import { AUTH_RUNTIME } from "@/server/auth";
import { handleMeRequest } from "@/server/auth/me-handler";

export const runtime = AUTH_RUNTIME;

export async function GET(request: Request): Promise<Response> {
  return handleMeRequest(request);
}

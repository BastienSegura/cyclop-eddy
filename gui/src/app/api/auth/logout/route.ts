import { AUTH_RUNTIME } from "@/server/auth";
import { handleLogoutRequest } from "@/server/auth/logout-handler";

export const runtime = AUTH_RUNTIME;

export async function POST(request: Request): Promise<Response> {
  return handleLogoutRequest(request);
}

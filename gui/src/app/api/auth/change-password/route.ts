import { AUTH_RUNTIME } from "@/server/auth";
import { handleChangePasswordRequest } from "@/server/auth/change-password-handler";

export const runtime = AUTH_RUNTIME;

export async function POST(request: Request): Promise<Response> {
  return handleChangePasswordRequest(request);
}

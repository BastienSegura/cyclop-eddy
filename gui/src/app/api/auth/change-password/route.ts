import { handleChangePasswordRequest } from "@/server/auth/change-password-handler";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleChangePasswordRequest(request);
}

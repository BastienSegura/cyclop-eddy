import { handleRegisterRequest } from "@/server/auth/register-handler";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleRegisterRequest(request);
}

import { handleLoginRequest } from "@/server/auth/login-handler";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleLoginRequest(request);
}

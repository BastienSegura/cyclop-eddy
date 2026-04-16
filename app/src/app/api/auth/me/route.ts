import { handleMeRequest } from "@/server/auth/me-handler";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleMeRequest(request);
}

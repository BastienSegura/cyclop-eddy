import { handleLogoutRequest } from "@/server/auth/logout-handler";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleLogoutRequest(request);
}

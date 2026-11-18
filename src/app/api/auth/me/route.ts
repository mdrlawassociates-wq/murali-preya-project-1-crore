import { getAuthContext } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  return ok(auth);
}

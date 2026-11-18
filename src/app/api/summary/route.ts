import { getAuthContext } from "@/lib/auth";
import { isValidMonth } from "@/lib/dates";
import { badRequest, ok, unauthorized } from "@/lib/http";
import { getSummary } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  if (!month || !isValidMonth(month)) return badRequest("Choose a valid month");
  return ok({ summary: getSummary(auth.household.id, month) });
}

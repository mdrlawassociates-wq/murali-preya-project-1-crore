import { getAuthContext } from "@/lib/auth";
import { conflict, ok, unauthorized } from "@/lib/http";
import { hasData, seedSampleData } from "@/lib/seed";

export const runtime = "nodejs";

export async function POST() {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (hasData(auth.household.id)) {
    return conflict("This household already has entries. Sample data was not added.");
  }

  seedSampleData(
    auth.household.id,
    auth.members.map((member) => member.id),
  );
  return ok();
}

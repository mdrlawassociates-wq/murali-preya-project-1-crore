import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, ok, unauthorized } from "@/lib/http";
import { householdSchema, validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  return ok({ household: auth.household, members: auth.members });
}

export async function PATCH(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  const payload = await request.json().catch(() => null);
  const parsed = householdSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));

  db.prepare("UPDATE households SET name = ? WHERE id = ?").run(
    parsed.data.name,
    auth.household.id,
  );
  return ok({ household: { ...auth.household, name: parsed.data.name } });
}

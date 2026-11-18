import { createUserId, getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, ok, unauthorized } from "@/lib/http";
import { personSchema, validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const payload = await request.json().catch(() => null);
  const parsed = personSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));

  const id = createUserId();
  db.prepare(
    "INSERT INTO people (id, household_id, name, created_at) VALUES (?, ?, ?, ?)",
  ).run(id, auth.household.id, parsed.data.name, Date.now());
  return ok({ person: { id, name: parsed.data.name } });
}

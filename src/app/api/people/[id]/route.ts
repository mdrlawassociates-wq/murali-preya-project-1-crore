import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, notFound, ok, unauthorized } from "@/lib/http";
import { personSchema, validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { id } = await params;

  const existing = db
    .prepare("SELECT id FROM people WHERE id = ? AND household_id = ?")
    .get(id, auth.household.id);
  if (!existing) return notFound("That person was not found");

  const payload = await request.json().catch(() => null);
  const parsed = personSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));

  db.prepare("UPDATE people SET name = ? WHERE id = ?").run(parsed.data.name, id);
  if (id === auth.user.id) {
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(parsed.data.name, id);
  }
  return ok({ person: { id, name: parsed.data.name } });
}

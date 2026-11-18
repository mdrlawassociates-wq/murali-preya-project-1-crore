import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, notFound, ok, unauthorized } from "@/lib/http";
import { getLoan } from "@/lib/queries";
import { validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  status: z.enum(["active", "closed"]).optional(),
  name: z.string().trim().min(2).max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function PATCH(request: Request, { params }: Context) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { id } = await params;

  const existing = getLoan(auth.household.id, id);
  if (!existing) return notFound("Loan not found");

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));
  const data = parsed.data;

  db.prepare(
    `UPDATE loans SET status = ?, name = ?, notes = ? WHERE id = ? AND household_id = ?`,
  ).run(
    data.status ?? existing.status,
    data.name ?? existing.name,
    data.notes ?? existing.notes,
    id,
    auth.household.id,
  );
  return ok();
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { id } = await params;

  const result = db
    .prepare("DELETE FROM loans WHERE id = ? AND household_id = ?")
    .run(id, auth.household.id);
  if (result.changes === 0) return notFound("Loan not found");
  return ok();
}

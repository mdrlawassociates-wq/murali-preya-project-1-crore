import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, notFound, ok, unauthorized } from "@/lib/http";
import { toPaise } from "@/lib/money";
import { validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const updateSchema = z.object({ amountRupees: z.number().positive().max(100000000) });

export async function PATCH(request: Request, { params }: Context) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { id } = await params;

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));

  const result = db
    .prepare("UPDATE budgets SET amount = ? WHERE id = ? AND household_id = ?")
    .run(toPaise(parsed.data.amountRupees), id, auth.household.id);
  if (result.changes === 0) return notFound("Budget not found");
  return ok();
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { id } = await params;

  const result = db
    .prepare("DELETE FROM budgets WHERE id = ? AND household_id = ?")
    .run(id, auth.household.id);
  if (result.changes === 0) return notFound("Budget not found");
  return ok();
}

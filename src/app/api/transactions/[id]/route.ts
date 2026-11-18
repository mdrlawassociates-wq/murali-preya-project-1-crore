import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidISODate } from "@/lib/dates";
import { badRequest, notFound, ok, unauthorized } from "@/lib/http";
import { toPaise } from "@/lib/money";
import { getTransaction } from "@/lib/queries";
import { categoryAllowed, transactionSchema, validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { id } = await params;

  const existing = getTransaction(auth.household.id, id);
  if (!existing) return notFound("Entry not found");

  const payload = await request.json().catch(() => null);
  const parsed = transactionSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));
  const data = parsed.data;

  if (!categoryAllowed(data.type, data.category)) {
    return badRequest(`“${data.category}” is not a ${data.type} category`);
  }
  if (!isValidISODate(data.occurredOn)) return badRequest("Choose a valid date");
  const memberId = data.memberId || existing.memberId;
  if (!auth.members.some((member) => member.id === memberId)) {
    return badRequest("Choose a household member");
  }

  db.prepare(
    `UPDATE transactions SET member_id = ?, type = ?, category = ?, amount = ?,
      occurred_on = ?, note = ? WHERE id = ? AND household_id = ?`,
  ).run(
    memberId,
    data.type,
    data.category,
    toPaise(data.amountRupees),
    data.occurredOn,
    data.note ?? "",
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
    .prepare("DELETE FROM transactions WHERE id = ? AND household_id = ?")
    .run(id, auth.household.id);
  if (result.changes === 0) return notFound("Entry not found");
  return ok();
}

import { createUserId, getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, ok, unauthorized } from "@/lib/http";
import { toPaise } from "@/lib/money";
import { listBudgets } from "@/lib/queries";
import { budgetSchema, validationMessage } from "@/lib/validation";
import { isValidMonth } from "@/lib/dates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  if (!month || !isValidMonth(month)) return badRequest("Choose a valid month");
  return ok({ budgets: listBudgets(auth.household.id, month) });
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  const payload = await request.json().catch(() => null);
  const parsed = budgetSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));
  const { category, month, amountRupees } = parsed.data;
  if (!isValidMonth(month)) return badRequest("Choose a valid month");

  const id = createUserId();
  db.prepare(
    `INSERT INTO budgets (id, household_id, category, month, amount, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(household_id, category, month) DO UPDATE SET amount = excluded.amount`,
  ).run(id, auth.household.id, category, month, toPaise(amountRupees), Date.now());

  return ok({ ok: true });
}

import { getAuthContext } from "@/lib/auth";
import { categoryAllowed, transactionSchema, validationMessage } from "@/lib/validation";
import { db } from "@/lib/db";
import { isValidISODate } from "@/lib/dates";
import { badRequest, ok, unauthorized } from "@/lib/http";
import { createUserId } from "@/lib/auth";
import { toPaise } from "@/lib/money";
import { listTransactions, mapTransaction } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const type = url.searchParams.get("type");
  const category = url.searchParams.get("category");
  const memberId = url.searchParams.get("memberId");
  const query = url.searchParams.get("q")?.toLowerCase().trim();

  let rows = listTransactions(auth.household.id);
  if (from) rows = rows.filter((row) => row.occurredOn >= from);
  if (to) rows = rows.filter((row) => row.occurredOn <= to);
  if (type === "income" || type === "expense") rows = rows.filter((row) => row.type === type);
  if (category) rows = rows.filter((row) => row.category === category);
  if (memberId) rows = rows.filter((row) => row.memberId === memberId);
  if (query) {
    rows = rows.filter(
      (row) =>
        row.note.toLowerCase().includes(query) || row.category.toLowerCase().includes(query),
    );
  }
  return ok({ transactions: rows });
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  const payload = await request.json().catch(() => null);
  const parsed = transactionSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));
  const data = parsed.data;

  if (!categoryAllowed(data.type, data.category)) {
    return badRequest(`“${data.category}” is not a ${data.type} category`);
  }
  if (!isValidISODate(data.occurredOn)) return badRequest("Choose a valid date");
  const memberId = data.memberId || auth.user.id;
  if (!auth.members.some((member) => member.id === memberId)) {
    return badRequest("Choose a household member");
  }

  const id = createUserId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO transactions
      (id, household_id, member_id, type, category, amount, occurred_on, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    auth.household.id,
    memberId,
    data.type,
    data.category,
    toPaise(data.amountRupees),
    data.occurredOn,
    data.note ?? "",
    now,
  );

  const row = db
    .prepare(
      `SELECT t.*, p.name AS member_name FROM transactions t
       JOIN people p ON p.id = t.member_id WHERE t.id = ?`,
    )
    .get(id) as Parameters<typeof mapTransaction>[0];
  return ok({ transaction: mapTransaction(row) });
}

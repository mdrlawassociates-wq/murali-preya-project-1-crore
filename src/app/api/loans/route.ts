import { createUserId, getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidISODate } from "@/lib/dates";
import { badRequest, ok, unauthorized } from "@/lib/http";
import { calculateEmi, toPaise } from "@/lib/money";
import { listLoans } from "@/lib/queries";
import { loanSchema, validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  return ok({ loans: listLoans(auth.household.id) });
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  const payload = await request.json().catch(() => null);
  const parsed = loanSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));
  const data = parsed.data;

  if (!isValidISODate(data.startDate)) return badRequest("Choose a valid start date");
  const principal = toPaise(data.principalRupees);
  const emi =
    data.emiRupees !== undefined && data.emiRupees > 0
      ? toPaise(data.emiRupees)
      : calculateEmi(principal, data.annualRate ?? 0, data.tenureMonths ?? 12);

  const id = createUserId();
  db.prepare(
    `INSERT INTO loans
      (id, household_id, kind, name, person, principal, annual_rate, start_date,
       tenure_months, emi, status, notes, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
  ).run(
    id,
    auth.household.id,
    data.kind,
    data.name,
    data.person ?? "",
    principal,
    data.annualRate ?? 0,
    data.startDate,
    data.tenureMonths ?? 12,
    emi,
    data.notes ?? "",
    auth.user.id,
    Date.now(),
  );

  return ok({ id, emi });
}

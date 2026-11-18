import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, ok, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { id } = await params;

  const row = db
    .prepare(
      `SELECT p.loan_id FROM loan_payments p
       JOIN loans l ON l.id = p.loan_id
       WHERE p.id = ? AND l.household_id = ?`,
    )
    .get(id, auth.household.id) as { loan_id: string } | undefined;
  if (!row) return notFound("Payment not found");

  db.transaction(() => {
    db.prepare("DELETE FROM loan_payments WHERE id = ?").run(id);
    const totals = db
      .prepare(
        "SELECT COALESCE(SUM(principal_component), 0) AS paid FROM loan_payments WHERE loan_id = ?",
      )
      .get(row.loan_id) as { paid: number };
    const loan = db
      .prepare("SELECT principal FROM loans WHERE id = ?")
      .get(row.loan_id) as { principal: number } | undefined;
    if (loan) {
      const status = loan.principal - totals.paid <= 0 ? "closed" : "active";
      db.prepare("UPDATE loans SET status = ? WHERE id = ?").run(status, row.loan_id);
    }
  })();

  return ok();
}

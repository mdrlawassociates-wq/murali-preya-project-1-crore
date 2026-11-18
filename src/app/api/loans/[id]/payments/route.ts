import { createUserId, getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidISODate } from "@/lib/dates";
import { badRequest, notFound, ok, unauthorized } from "@/lib/http";
import { splitPayment, toPaise } from "@/lib/money";
import { getLoan } from "@/lib/queries";
import { paymentSchema, validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { id } = await params;

  const loan = getLoan(auth.household.id, id);
  if (!loan) return notFound("Loan not found");

  const payload = await request.json().catch(() => null);
  const parsed = paymentSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));
  const data = parsed.data;

  if (!isValidISODate(data.paidOn)) return badRequest("Choose a valid date");
  const memberId = data.memberId || auth.user.id;
  if (!auth.members.some((member) => member.id === memberId)) {
    return badRequest("Choose a household member");
  }

  const amount = toPaise(data.amountRupees);
  const split = splitPayment(amount, loan.outstanding, loan.annualRate);
  const paymentId = createUserId();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO loan_payments
        (id, loan_id, member_id, amount, paid_on, principal_component, interest_component, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      paymentId,
      id,
      memberId,
      amount,
      data.paidOn,
      split.principal,
      split.interest,
      data.note ?? "",
      Date.now(),
    );
    if (loan.outstanding - split.principal <= 0) {
      db.prepare("UPDATE loans SET status = 'closed' WHERE id = ?").run(id);
    }
  })();

  return ok({ id: paymentId, ...split });
}

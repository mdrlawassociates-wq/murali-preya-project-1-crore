import type { Metadata } from "next";
import { LoansView } from "@/components/LoansView";
import { requireAuth } from "@/lib/auth";
import { monthKey } from "@/lib/dates";
import { getSummary, listLoans, listPayments } from "@/lib/queries";

export const metadata: Metadata = { title: "Loans" };

export default async function LoansPage() {
  const auth = await requireAuth();
  const summary = getSummary(auth.household.id, monthKey());
  return (
    <LoansView
      loans={listLoans(auth.household.id)}
      payments={listPayments(auth.household.id)}
      members={auth.members}
      currentUserId={auth.user.id}
      insights={summary.loanInsights}
    />
  );
}

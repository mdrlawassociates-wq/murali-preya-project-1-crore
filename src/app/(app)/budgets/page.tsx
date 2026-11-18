import type { Metadata } from "next";
import { BudgetsView } from "@/components/BudgetsView";
import { requireAuth } from "@/lib/auth";
import { isValidMonth, monthKey } from "@/lib/dates";
import { getSummary } from "@/lib/queries";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const auth = await requireAuth();
  const params = await searchParams;
  const month = params.month && isValidMonth(params.month) ? params.month : monthKey();
  const summary = getSummary(auth.household.id, month);
  return <BudgetsView budgets={summary.budgets} month={month} />;
}

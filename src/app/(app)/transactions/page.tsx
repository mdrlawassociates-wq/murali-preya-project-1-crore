import type { Metadata } from "next";
import { TransactionsView } from "@/components/TransactionsView";
import { requireAuth } from "@/lib/auth";
import { isValidMonth, monthKey } from "@/lib/dates";
import { listTransactions } from "@/lib/queries";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const auth = await requireAuth();
  const params = await searchParams;
  const month = params.month && isValidMonth(params.month) ? params.month : monthKey();
  return (
    <TransactionsView
      transactions={listTransactions(auth.household.id)}
      members={auth.members}
      currentUserId={auth.user.id}
      month={month}
    />
  );
}

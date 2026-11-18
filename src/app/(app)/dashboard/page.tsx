import type { Metadata } from "next";
import { DashboardView } from "@/components/DashboardView";
import { requireAuth } from "@/lib/auth";
import { isValidMonth, monthKey } from "@/lib/dates";
import { getSummary } from "@/lib/queries";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const auth = await requireAuth();
  const params = await searchParams;
  const month = params.month && isValidMonth(params.month) ? params.month : monthKey();
  return <DashboardView summary={getSummary(auth.household.id, month)} />;
}

import type { Metadata } from "next";
import { MembersView } from "@/components/MembersView";
import { requireAuth } from "@/lib/auth";
import { monthKey, monthLabel } from "@/lib/dates";
import { getSummary } from "@/lib/queries";

export const metadata: Metadata = { title: "People" };

export default async function MembersPage() {
  const auth = await requireAuth();
  const summary = getSummary(auth.household.id, monthKey());
  return (
    <MembersView
      user={auth.user}
      household={auth.household}
      members={auth.members}
      spend={summary.memberSpend}
      monthLabel={monthLabel(monthKey())}
    />
  );
}

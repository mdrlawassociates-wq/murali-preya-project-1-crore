import type { Metadata } from "next";
import { SettingsView } from "@/components/SettingsView";
import { requireAuth } from "@/lib/auth";
import { hasData } from "@/lib/seed";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const auth = await requireAuth();
  return (
    <SettingsView
      user={auth.user}
      household={auth.household}
      hasData={hasData(auth.household.id)}
    />
  );
}

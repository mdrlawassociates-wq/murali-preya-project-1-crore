import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getAuthContext } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  return (
    <AppShell user={auth.user} members={auth.members}>
      {children}
    </AppShell>
  );
}

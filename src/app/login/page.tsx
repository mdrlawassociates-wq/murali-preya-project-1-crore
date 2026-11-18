import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getAuthContext()) redirect("/dashboard");
  return (
    <AuthShell>
      <AuthForm mode="login" />
    </AuthShell>
  );
}

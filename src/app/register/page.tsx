import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage() {
  if (await getAuthContext()) redirect("/dashboard");
  return (
    <AuthShell>
      <AuthForm mode="register" />
    </AuthShell>
  );
}

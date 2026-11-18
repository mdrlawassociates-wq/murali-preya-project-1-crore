"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api, body } from "@/lib/client";

interface Props {
  mode: "login" | "register";
}

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await api("/api/auth/login", body({ email, password }));
      } else {
        await api("/api/auth/register", body({
          name,
          partnerName: partnerName || undefined,
          email,
          password,
          householdName,
        }));
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not continue");
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card__head">
        <p className="eyebrow">{mode === "login" ? "Welcome back" : "Start your ledger"}</p>
        <h2>{mode === "login" ? "Sign in to your household" : "Create your household"}</h2>
        <p className="auth-card__hint">
          {mode === "login"
            ? "One login for both of you. Pick up where you left off."
            : "One account, shared by both of you. Entries can still be tagged with who added them."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        {mode === "register" && (
          <>
            <label className="field">
              <span>Your name</span>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Murali"
                required
              />
            </label>
            <label className="field">
              <span>Partner&apos;s name <em>optional</em></span>
              <input
                type="text"
                value={partnerName}
                onChange={(event) => setPartnerName(event.target.value)}
                placeholder="e.g. Preya"
              />
            </label>
            <label className="field">
              <span>Household name</span>
              <input
                type="text"
                value={householdName}
                onChange={(event) => setHouseholdName(event.target.value)}
                placeholder="e.g. SRD household"
                required
              />
            </label>
          </>
        )}

        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
            minLength={mode === "register" ? 8 : 1}
            required
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="btn btn--primary btn--wide" type="submit" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : "Create household"}
          <ArrowRight size={17} />
        </button>
      </form>

      <p className="auth-switch">
        {mode === "login" ? (
          <>New here? <Link href="/register">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href="/login">Sign in</Link></>
        )}
      </p>
    </div>
  );
}

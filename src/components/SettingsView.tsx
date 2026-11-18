"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, LogOut, ShieldCheck, X } from "lucide-react";
import { useApp } from "./AppContext";
import { api, body } from "@/lib/client";
import type { AuthUser, Household } from "@/lib/types";

interface Props {
  user: AuthUser;
  household: Household;
  hasData: boolean;
}

export function SettingsView({ user, household, hasData }: Props) {
  const { notify } = useApp();
  const router = useRouter();
  const [name, setName] = useState(household.name);
  const [savingName, setSavingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function saveHousehold(event: React.FormEvent) {
    event.preventDefault();
    setSavingName(true);
    try {
      await api("/api/household", { method: "PATCH", body: JSON.stringify({ name }) });
      notify("Household name saved");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save the name", "error");
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setSavingPassword(true);
    try {
      await api("/api/auth/password", body({ currentPassword, newPassword }));
      setCurrentPassword("");
      setNewPassword("");
      notify("Password updated");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update the password", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  async function loadSample() {
    if (!window.confirm("Add sample entries, loans and budgets to this empty household?")) return;
    setSeeding(true);
    try {
      await api("/api/seed", { method: "POST" });
      notify("Sample data added");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not add sample data", "error");
    } finally {
      setSeeding(false);
    }
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="settings-view">
      <section className="panel panel--wide">
        <div className="panel__head">
          <div><p className="eyebrow">Household</p><h3>Basic details</h3></div>
        </div>
        <form className="settings-form" onSubmit={saveHousehold}>
          <label className="field">
            <span>Household name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} required />
          </label>
          <div className="settings-form__row">
            <div><span>Shared login</span><strong>{user.email}</strong></div>
            <div><span>Currency</span><strong>Indian Rupee (₹)</strong></div>
            <div><span>Household people</span><strong>Manage in People</strong></div>
          </div>
          <div className="settings-form__actions">
            <button className="btn btn--primary btn--sm" disabled={savingName}>
              {savingName ? "Saving…" : "Save household"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel panel--wide">
        <div className="panel__head">
          <div><p className="eyebrow">Account</p><h3>Change password</h3></div>
          <span className="badge-note"><ShieldCheck size={15} /> Private to you</span>
        </div>
        <form className="settings-form" onSubmit={changePassword}>
          <label className="field"><span>Current password</span><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" /></label>
          <label className="field"><span>New password</span><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required autoComplete="new-password" placeholder="At least 8 characters" /></label>
          <div className="settings-form__actions">
            <button className="btn btn--primary btn--sm" disabled={savingPassword}>
              {savingPassword ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel panel--wide">
        <div className="panel__head">
          <div><p className="eyebrow">Getting started</p><h3>Sample data</h3></div>
          <span className="badge-note"><Database size={15} /> Optional</span>
        </div>
        <div className="settings-note">
          <p>
            Want to see how the metrics look before entering your own numbers? Add sample income,
            expenses, home/car/gold loans and monthly budgets across the last four months.
          </p>
          <button className="btn btn--quiet btn--sm" onClick={loadSample} disabled={hasData || seeding}>
            {hasData ? "Already have entries" : seeding ? "Adding…" : "Load sample data"}
          </button>
        </div>
      </section>

      <section className="panel panel--wide settings-signout">
        <div>
          <h3>Sign out of this device</h3>
          <p>Your household data stays in the app. You can sign back in any time.</p>
        </div>
        <button className="btn btn--outline" onClick={signOut}><LogOut size={16} /> Sign out</button>
      </section>

      <p className="settings-foot"><X size={13} /> Amounts are stored in paise and shown in Indian Rupees. No bank connections are required.</p>
    </div>
  );
}

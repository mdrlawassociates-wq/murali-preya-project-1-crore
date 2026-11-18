"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Pencil, Plus, ShieldCheck, Users, X } from "lucide-react";
import { useApp } from "./AppContext";
import { api, body, patchBody } from "@/lib/client";
import { formatCompact } from "@/lib/money";
import type { AuthUser, Household, Member, MemberSpend } from "@/lib/types";

interface Props {
  user: AuthUser;
  household: Household;
  members: Member[];
  spend: MemberSpend[];
  monthLabel: string;
}

export function MembersView({ user, household, members, spend, monthLabel }: Props) {
  const { notify } = useApp();
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  async function rename(member: Member) {
    setSaving(true);
    try {
      await api(`/api/people/${member.id}`, patchBody({ name: draft }));
      notify("Name updated");
      setEditing(null);
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update the name", "error");
    } finally {
      setSaving(false);
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api("/api/people", body({ name: newName }));
      notify("Person added");
      setNewName("");
      setAdding(false);
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not add the person", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="members-view">
      <section className="panel panel--wide">
        <div className="panel__head">
          <div>
            <p className="eyebrow">Shared access</p>
            <h3>One login for both of you</h3>
          </div>
          <span className="badge-note"><ShieldCheck size={15} /> Private to your household</span>
        </div>
        <div className="explain-grid">
          <div>
            <span className="explain-icon"><LogIn size={18} /></span>
            <strong>Same credentials</strong>
            <p>You both sign in with the email and password below. No invites, no second account.</p>
          </div>
          <div>
            <span className="explain-icon"><Users size={18} /></span>
            <strong>One ledger</strong>
            <p>Both of you see the same income, expenses, budgets and loans in real time.</p>
          </div>
          <div>
            <span className="explain-icon"><Pencil size={18} /></span>
            <strong>Know who added what</strong>
            <p>Entries are tagged with a household name, so you can still tell whose expense it was.</p>
          </div>
        </div>
        <div className="invite-strip">
          <div>
            <span>Shared login email</span>
            <strong className="mono shared-login">{user.email}</strong>
          </div>
          <span className="badge-note">Change password in Settings</span>
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__head">
          <div>
            <p className="eyebrow">Household</p>
            <h3>People in {household.name}</h3>
          </div>
          <button className="btn btn--quiet btn--sm" onClick={() => setAdding((value) => !value)}>
            {adding ? <X size={15} /> : <Plus size={15} />}
            {adding ? "Cancel" : "Add person"}
          </button>
        </div>

        {adding && (
          <form className="people-add" onSubmit={add}>
            <label className="field">
              <span>Name</span>
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. Preya"
                required
                autoFocus
              />
            </label>
            <button className="btn btn--primary btn--sm" disabled={saving}>Add</button>
          </form>
        )}

        <div className="member-grid">
          {members.map((member) => {
            const spent = spend.find((item) => item.memberId === member.id)?.amount ?? 0;
            return (
              <article className="member-card" key={member.id}>
                <span className="avatar avatar--large">{member.name.slice(0, 1).toUpperCase()}</span>
                <div className="member-card__body">
                  {editing === member.id ? (
                    <div className="people-edit">
                      <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        aria-label={`Rename ${member.name}`}
                        autoFocus
                      />
                      <button className="btn btn--primary btn--sm" onClick={() => rename(member)} disabled={saving}>
                        Save
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <strong>{member.name}</strong>
                  )}
                  {editing !== member.id && <span>Expense label for entries</span>}
                </div>
                <div className="member-card__stat">
                  <span>Recorded spend in {monthLabel}</span>
                  <strong>{formatCompact(spent)}</strong>
                </div>
                {editing !== member.id && (
                  <button
                    className="icon-btn"
                    onClick={() => { setEditing(member.id); setDraft(member.name); }}
                    aria-label={`Rename ${member.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

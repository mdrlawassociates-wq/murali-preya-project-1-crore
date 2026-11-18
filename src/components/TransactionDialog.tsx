"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { api, patchBody, body } from "@/lib/client";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { todayISO } from "@/lib/dates";
import { fromPaise } from "@/lib/money";
import type { Member, Transaction } from "@/lib/types";
import type { QuickAddDefaults } from "./AppContext";

interface Props {
  open: boolean;
  onClose: () => void;
  members: Member[];
  currentUserId: string;
  defaults?: QuickAddDefaults;
  entry?: Transaction | null;
  onSaved?: () => void;
  notify: (message: string, tone?: "success" | "error") => void;
}

const expenseList = EXPENSE_CATEGORIES as readonly string[];
const incomeList = INCOME_CATEGORIES as readonly string[];

export function TransactionDialog({
  open,
  onClose,
  members,
  currentUserId,
  defaults = {},
  entry,
  onSaved,
  notify,
}: Props) {
  const router = useRouter();
  const [type, setType] = useState<"income" | "expense">(entry?.type ?? defaults.type ?? "expense");
  const [category, setCategory] = useState(
    entry?.category ?? defaults.category ?? EXPENSE_CATEGORIES[0],
  );
  const [amount, setAmount] = useState(
    entry ? String(fromPaise(entry.amount)) : "",
  );
  const [occurredOn, setOccurredOn] = useState(
    entry?.occurredOn ?? defaults.occurredOn ?? todayISO(),
  );
  const [memberId, setMemberId] = useState(
    entry?.memberId ?? defaults.memberId ?? currentUserId,
  );
  const [note, setNote] = useState(entry?.note ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(entry?.type ?? defaults.type ?? "expense");
    const nextType = entry?.type ?? defaults.type ?? "expense";
    setCategory(
      entry?.category ??
        defaults.category ??
        (nextType === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]),
    );
    setAmount(entry ? String(fromPaise(entry.amount)) : "");
    setOccurredOn(entry?.occurredOn ?? defaults.occurredOn ?? todayISO());
    setMemberId(entry?.memberId ?? defaults.memberId ?? currentUserId);
    setNote(entry?.note ?? "");
  }, [open, entry, defaults, currentUserId]);

  const categories = type === "income" ? incomeList : expenseList;

  function changeType(next: "income" | "expense") {
    setType(next);
    setCategory(next === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const rupees = Number(amount);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      notify("Enter an amount above zero", "error");
      return;
    }
    const payload = {
      type,
      category,
      amountRupees: rupees,
      occurredOn,
      memberId,
      note,
    };
    setSaving(true);
    try {
      if (entry) {
        await api(`/api/transactions/${entry.id}`, patchBody(payload));
        notify("Entry updated");
      } else {
        await api("/api/transactions", body(payload));
        notify(type === "income" ? "Income saved" : "Expense saved");
      }
      onClose();
      onSaved?.();
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save the entry", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal modal--narrow"
        role="dialog"
        aria-modal="true"
        aria-label={entry ? "Edit entry" : "Add entry"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <p className="eyebrow">Household ledger</p>
            <h2>{entry ? "Edit entry" : "Add an entry"}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="segmented" role="group" aria-label="Entry type">
            <button
              type="button"
              className={type === "expense" ? "active" : ""}
              onClick={() => changeType("expense")}
            >
              Expense
            </button>
            <button
              type="button"
              className={type === "income" ? "active" : ""}
              onClick={() => changeType("income")}
            >
              Income
            </button>
          </div>

          <label className="field field--amount">
            <span>Amount</span>
            <div className="amount-input">
              <span className="amount-input__symbol">₹</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                autoFocus
                required
              />
            </div>
          </label>

          <div className="field-row">
            <label className="field">
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={occurredOn}
                onChange={(event) => setOccurredOn(event.target.value)}
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Recorded for</span>
            <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Note <em>optional</em></span>
            <input
              type="text"
              maxLength={240}
              placeholder="What was this for?"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : entry ? "Save changes" : "Save entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

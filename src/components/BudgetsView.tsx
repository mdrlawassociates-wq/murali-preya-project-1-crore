"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { useApp } from "./AppContext";
import { MonthSwitcher } from "./MonthSwitcher";
import { api, body } from "@/lib/client";
import { colorForCategory, EXPENSE_CATEGORIES } from "@/lib/categories";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { formatCompact, formatMoney, toPaise } from "@/lib/money";
import type { BudgetWithSpend } from "@/lib/types";

interface Props {
  budgets: BudgetWithSpend[];
  month: string;
}

export function BudgetsView({ budgets, month }: Props) {
  const { notify } = useApp();
  const router = useRouter();
  const [editing, setEditing] = useState<BudgetWithSpend | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [copying, setCopying] = useState(false);

  const totalLimit = budgets.reduce((sum, item) => sum + item.amount, 0);
  const totalSpent = budgets.reduce((sum, item) => sum + item.spent, 0);

  async function remove(budget: BudgetWithSpend) {
    if (!window.confirm(`Remove the ${budget.category} budget for ${monthLabel(month)}?`)) return;
    try {
      await api(`/api/budgets/${budget.id}`, { method: "DELETE" });
      notify("Budget removed");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not remove the budget", "error");
    }
  }

  async function copyLastMonth() {
    setCopying(true);
    try {
      const previous = shiftMonth(month, -1);
      const result = await api<{ budgets: Array<{ category: string; amount: number }> }>(
        `/api/budgets?month=${previous}`,
      );
      if (result.budgets.length === 0) {
        notify(`No budgets set in ${monthLabel(previous)}`, "error");
        return;
      }
      await Promise.all(
        result.budgets.map((item) =>
          api("/api/budgets", body({
            category: item.category,
            month,
            amountRupees: item.amount / 100,
          })),
        ),
      );
      notify(`Copied ${result.budgets.length} budgets from ${monthLabel(previous)}`);
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not copy budgets", "error");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="budgets-view">
      <div className="page-tools">
        <MonthSwitcher month={month} />
        <div className="page-tools__actions">
          <button className="btn btn--quiet" onClick={copyLastMonth} disabled={copying}>
            <Copy size={16} /> {copying ? "Copying…" : "Copy last month"}
          </button>
          <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Set budget
          </button>
        </div>
      </div>

      <div className="budget-summary">
        <div><span>Total budgeted</span><strong>{formatCompact(totalLimit)}</strong></div>
        <div><span>Spent so far</span><strong>{formatCompact(totalSpent)}</strong></div>
        <div><span>Remaining</span><strong className={totalLimit - totalSpent >= 0 ? "positive" : "negative"}>{formatCompact(totalLimit - totalSpent)}</strong></div>
      </div>

      {budgets.length === 0 ? (
        <div className="empty-state">
          <h3>No budgets for {monthLabel(month)}</h3>
          <p>Set limits for the categories you want to watch, like groceries or fuel.</p>
          <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Set a budget
          </button>
        </div>
      ) : (
        <div className="budget-grid">
          {budgets.map((budget) => (
            <article className="budget-card" key={budget.id}>
              <div className="budget-card__head">
                <span className="category-chip">
                  <i style={{ background: colorForCategory(budget.category) }} />
                  {budget.category}
                </span>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => setEditing(budget)} aria-label="Edit budget"><Pencil size={15} /></button>
                  <button className="icon-btn icon-btn--danger" onClick={() => remove(budget)} aria-label="Delete budget"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="budget-card__figures">
                <strong>{formatMoney(budget.spent)}</strong>
                <span>of {formatMoney(budget.amount)}</span>
              </div>
              <div className="progress-track progress-track--large">
                <div
                  className={`progress-fill ${budget.percent > 100 ? "progress-fill--over" : ""}`}
                  style={{ width: `${Math.min(100, budget.percent)}%`, background: colorForCategory(budget.category) }}
                />
              </div>
              <div className="budget-card__foot">
                <span>{Math.round(budget.percent)}% used</span>
                <span className={budget.remaining < 0 ? "negative" : ""}>
                  {budget.remaining >= 0 ? `${formatMoney(budget.remaining)} left` : `${formatMoney(Math.abs(budget.remaining))} over`}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <BudgetDialog
        open={showAdd || editing !== null}
        budget={editing}
        month={month}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        notify={notify}
      />
    </div>
  );
}

function BudgetDialog({
  open,
  budget,
  month,
  onClose,
  notify,
}: {
  open: boolean;
  budget: BudgetWithSpend | null;
  month: string;
  onClose: () => void;
  notify: (message: string, tone?: "success" | "error") => void;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<string>(budget?.category ?? EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState(budget ? String(toPaise(budget.amount) / 100) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory(budget?.category ?? EXPENSE_CATEGORIES[0]);
    setAmount(budget ? String(toPaise(budget.amount) / 100) : "");
  }, [open, budget]);

  function close() {
    setAmount("");
    setCategory(EXPENSE_CATEGORIES[0]);
    onClose();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (budget) {
        await api(`/api/budgets/${budget.id}`, body({ amountRupees: Number(amount) }));
        notify("Budget updated");
      } else {
        await api("/api/budgets", body({ category, month, amountRupees: Number(amount) }));
        notify("Budget set");
      }
      close();
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save the budget", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={close} role="presentation">
      <div className="modal modal--narrow" role="dialog" aria-modal="true" aria-label="Budget" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div><p className="eyebrow">{monthLabel(month)}</p><h2>{budget ? "Edit budget" : "Set a budget"}</h2></div>
          <button className="icon-btn" onClick={close} aria-label="Close"><X size={18} /></button>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={budget !== null}>
              {EXPENSE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="field"><span>Monthly limit (₹)</span><input type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></label>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={close}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Saving…" : budget ? "Save changes" : "Set budget"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

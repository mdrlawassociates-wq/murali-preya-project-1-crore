"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useApp } from "./AppContext";
import { TransactionDialog } from "./TransactionDialog";
import { api } from "@/lib/client";
import { colorForCategory } from "@/lib/categories";
import { formatDate, monthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { Member, Transaction } from "@/lib/types";

interface Props {
  transactions: Transaction[];
  members: Member[];
  currentUserId: string;
  month: string;
}

export function TransactionsView({ transactions, members, currentUserId, month }: Props) {
  const { openQuickAdd, notify } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [member, setMember] = useState("all");
  const [period, setPeriod] = useState(month);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(transactions.map((tx) => tx.category))).sort(),
    [transactions],
  );
  const months = useMemo(
    () => Array.from(new Set(transactions.map((tx) => tx.occurredOn.slice(0, 7)))).sort().reverse(),
    [transactions],
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return transactions.filter((tx) => {
      if (period !== "all" && !tx.occurredOn.startsWith(period)) return false;
      if (type !== "all" && tx.type !== type) return false;
      if (category !== "all" && tx.category !== category) return false;
      if (member !== "all" && tx.memberId !== member) return false;
      if (query && !`${tx.note} ${tx.category} ${tx.memberName}`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [transactions, search, type, category, member, period]);

  const totals = filtered.reduce(
    (acc, tx) => {
      acc[tx.type] += tx.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  async function remove(tx: Transaction) {
    if (!window.confirm(`Delete “${tx.note || tx.category}” (${formatMoney(tx.amount)})?`)) return;
    try {
      await api(`/api/transactions/${tx.id}`, { method: "DELETE" });
      notify("Entry deleted");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete the entry", "error");
    }
  }

  function exportCsv() {
    const header = ["Date", "Type", "Category", "Amount (INR)", "Recorded for", "Note"];
    const rows = filtered.map((tx) => [
      tx.occurredOn,
      tx.type,
      tx.category,
      (tx.amount / 100).toFixed(2),
      tx.memberName,
      tx.note,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `murali-preya-project-1-crore-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="transactions-view">
      <div className="page-tools">
        <div className="filters">
          <label className="search-field">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search notes or categories"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Month">
            <option value="all">All months</option>
            {months.map((item) => (
              <option key={item} value={item}>{monthLabel(item)}</option>
            ))}
          </select>
          <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Type">
            <option value="all">Income & expenses</option>
            <option value="income">Income only</option>
            <option value="expense">Expenses only</option>
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={member} onChange={(event) => setMember(event.target.value)} aria-label="Person">
            <option value="all">Everyone</option>
            {members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="page-tools__actions">
          <button className="btn btn--quiet" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn--primary" onClick={() => openQuickAdd()}>
            <Plus size={16} /> Add entry
          </button>
        </div>
      </div>

      <div className="ledger-totals">
        <div><span>Showing</span><strong>{filtered.length} entries</strong></div>
        <div><span>Income</span><strong className="positive">{formatMoney(totals.income)}</strong></div>
        <div><span>Spent</span><strong className="negative">{formatMoney(totals.expense)}</strong></div>
        <div><span>Net</span><strong>{formatMoney(totals.income - totals.expense)}</strong></div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No entries match these filters</h3>
          <p>Try another month or category, or add a new entry.</p>
          <button className="btn btn--primary" onClick={() => openQuickAdd()}>
            <Plus size={16} /> Add entry
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Details</th>
                <th>Category</th>
                <th>Recorded for</th>
                <th className="ta-right">Amount</th>
                <th className="ta-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id}>
                  <td className="nowrap">{formatDate(tx.occurredOn)}</td>
                  <td>
                    <strong>{tx.note || "—"}</strong>
                    <span className="table-sub">{tx.type === "income" ? "Income" : "Expense"}</span>
                  </td>
                  <td>
                    <span className="category-chip">
                      <i style={{ background: colorForCategory(tx.category) }} />
                      {tx.category}
                    </span>
                  </td>
                  <td>{tx.memberName}</td>
                  <td className={`ta-right nowrap strong ${tx.type === "income" ? "positive" : ""}`}>
                    {tx.type === "income" ? "+" : "−"}{formatMoney(tx.amount)}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => setEditing(tx)} aria-label="Edit entry">
                        <Pencil size={15} />
                      </button>
                      <button className="icon-btn icon-btn--danger" onClick={() => remove(tx)} aria-label="Delete entry">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TransactionDialog
        open={editing !== null}
        entry={editing}
        onClose={() => setEditing(null)}
        members={members}
        currentUserId={currentUserId}
        notify={notify}
      />
    </div>
  );
}

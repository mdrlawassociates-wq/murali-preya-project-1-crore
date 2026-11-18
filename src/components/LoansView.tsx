"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  CircleDollarSign,
  HandCoins,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useApp } from "./AppContext";
import { LoanClosurePanel } from "./LoanClosurePanel";
import { api, body, patchBody } from "@/lib/client";
import { formatDate, todayISO } from "@/lib/dates";
import type { LoanInsightsBundle } from "@/lib/loan-advice";
import { calculateEmi, formatCompact, formatMoney, toPaise } from "@/lib/money";
import type { Loan, LoanKind, LoanPayment, Member } from "@/lib/types";

interface Props {
  loans: Loan[];
  payments: LoanPayment[];
  members: Member[];
  currentUserId: string;
  insights: LoanInsightsBundle;
}

export function LoansView({ loans, payments, members, currentUserId, insights }: Props) {
  const { notify } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | LoanKind | "closed">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);

  const visible = useMemo(() => {
    if (filter === "all") return loans;
    if (filter === "closed") return loans.filter((loan) => loan.status === "closed");
    return loans.filter((loan) => loan.kind === filter && loan.status === "active");
  }, [loans, filter]);

  const totals = loans.reduce(
    (acc, loan) => {
      if (loan.status === "active") {
        if (loan.kind === "borrowed") acc.borrowed += loan.outstanding;
        else acc.lent += loan.outstanding;
        if (loan.kind === "borrowed" && loan.outstanding > 0) acc.emi += loan.emi;
      }
      return acc;
    },
    { borrowed: 0, lent: 0, emi: 0 },
  );

  function toggleExpanded(id: string) {
    setExpanded((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function toggleStatus(loan: Loan) {
    const next = loan.status === "active" ? "closed" : "active";
    try {
      await api(`/api/loans/${loan.id}`, patchBody({ status: next }));
      notify(next === "closed" ? "Loan marked as closed" : "Loan reopened");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update the loan", "error");
    }
  }

  async function deleteLoan(loan: Loan) {
    if (!window.confirm(`Delete “${loan.name}” and all its payments?`)) return;
    try {
      await api(`/api/loans/${loan.id}`, { method: "DELETE" });
      notify("Loan deleted");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete the loan", "error");
    }
  }

  async function deletePayment(payment: LoanPayment) {
    if (!window.confirm("Remove this payment from the loan?")) return;
    try {
      await api(`/api/loan-payments/${payment.id}`, { method: "DELETE" });
      notify("Payment removed");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not remove the payment", "error");
    }
  }

  return (
    <div className="loans-view">
      <div className="page-tools">
        <div className="tabs">
          {(["all", "borrowed", "lent", "closed"] as const).map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item === "all" ? "All loans" : item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add loan
        </button>
      </div>

      <div className="loan-totals">
        <div>
          <span>Borrowing outstanding</span>
          <strong>{formatCompact(totals.borrowed)}</strong>
        </div>
        <div>
          <span>Outstanding to you</span>
          <strong className="positive">{formatCompact(totals.lent)}</strong>
        </div>
        <div>
          <span>Monthly EMI commitment</span>
          <strong>{formatCompact(totals.emi)}</strong>
        </div>
      </div>

      <LoanClosurePanel insights={insights} />

      {visible.length === 0 ? (
        <div className="empty-state">
          <h3>No loans here yet</h3>
          <p>Add a loan to track EMIs, repayments and who owes whom.</p>
          <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add loan
          </button>
        </div>
      ) : (
        <div className="loan-grid">
          {visible.map((loan) => {
            const loanPayments = payments.filter((payment) => payment.loanId === loan.id);
            const isOpen = expanded.includes(loan.id);
            return (
              <article className={`loan-card ${loan.status === "closed" ? "loan-card--closed" : ""}`} key={loan.id}>
                <div className="loan-card__head">
                  <div>
                    <span className={`kind-badge kind-badge--${loan.kind}`}>
                      {loan.kind === "borrowed" ? "Borrowed" : "Lent"}
                    </span>
                    <h3>{loan.name}</h3>
                    <p>{loan.person || "—"}</p>
                  </div>
                  <span className={`status-badge status-badge--${loan.status}`}>
                    {loan.status}
                  </span>
                </div>

                <div className="loan-card__amounts">
                  <div>
                    <span>Principal</span>
                    <strong>{formatCompact(loan.principal)}</strong>
                  </div>
                  <div>
                    <span>Outstanding</span>
                    <strong className={loan.kind === "lent" ? "positive" : ""}>
                      {formatCompact(loan.outstanding)}
                    </strong>
                  </div>
                </div>

                <div className="loan-progress">
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${loan.progress}%`,
                        background: loan.kind === "borrowed" ? "#2f7d68" : "#5b6fb3",
                      }}
                    />
                  </div>
                  <span>{loan.progress.toFixed(0)}% repaid · {loan.paymentCount} payments</span>
                </div>

                <div className="loan-card__meta">
                  <div><span>Interest</span><strong>{loan.annualRate}% p.a.</strong></div>
                  <div><span>EMI</span><strong>{formatCompact(loan.emi)}</strong></div>
                  <div><span>Next due</span><strong>{loan.nextDueDate ? formatDate(loan.nextDueDate) : "—"}</strong></div>
                  <div><span>Started</span><strong>{formatDate(loan.startDate)}</strong></div>
                </div>

                {loan.notes && <p className="loan-card__note">{loan.notes}</p>}

                <div className="loan-card__actions">
                  <button
                    className="btn btn--quiet btn--sm"
                    onClick={() => setPaymentLoan(loan)}
                    disabled={loan.outstanding <= 0}
                  >
                    <CircleDollarSign size={15} /> Record payment
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => toggleExpanded(loan.id)}>
                    <ChevronDown size={15} className={isOpen ? "rotate" : ""} />
                    {isOpen ? "Hide" : "Payments"}
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => toggleStatus(loan)}>
                    {loan.status === "active" ? <Check size={15} /> : <HandCoins size={15} />}
                    {loan.status === "active" ? "Close" : "Reopen"}
                  </button>
                  <button
                    className="icon-btn icon-btn--danger loan-card__delete"
                    onClick={() => deleteLoan(loan)}
                    aria-label="Delete loan"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {isOpen && (
                  <div className="payment-list">
                    {loanPayments.length === 0 ? (
                      <p className="payment-list__empty">No payments recorded for this loan.</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>By</th>
                            <th className="ta-right">Principal</th>
                            <th className="ta-right">Interest</th>
                            <th className="ta-right">Total</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {loanPayments.map((payment) => (
                            <tr key={payment.id}>
                              <td className="nowrap">{formatDate(payment.paidOn)}</td>
                              <td>{payment.memberName}</td>
                              <td className="ta-right">{formatMoney(payment.principalComponent)}</td>
                              <td className="ta-right">{formatMoney(payment.interestComponent)}</td>
                              <td className="ta-right strong">{formatMoney(payment.amount)}</td>
                              <td className="ta-right">
                                <button
                                  className="icon-btn icon-btn--danger"
                                  onClick={() => deletePayment(payment)}
                                  aria-label="Delete payment"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <AddLoanDialog open={showAdd} onClose={() => setShowAdd(false)} notify={notify} />
      <PaymentDialog
        loan={paymentLoan}
        onClose={() => setPaymentLoan(null)}
        members={members}
        currentUserId={currentUserId}
        notify={notify}
      />
    </div>
  );
}

function AddLoanDialog({
  open,
  onClose,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  notify: (message: string, tone?: "success" | "error") => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<LoanKind>("borrowed");
  const [name, setName] = useState("");
  const [person, setPerson] = useState("");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("0");
  const [startDate, setStartDate] = useState(todayISO());
  const [tenure, setTenure] = useState("12");
  const [emi, setEmi] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const computedEmi = calculateEmi(
    toPaise(Number(principal) || 0),
    Number(rate) || 0,
    Number(tenure) || 12,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api("/api/loans", body({
        kind,
        name,
        person,
        principalRupees: Number(principal),
        annualRate: Number(rate),
        startDate,
        tenureMonths: Number(tenure),
        emiRupees: emi ? Number(emi) : undefined,
        notes,
      }));
      notify(kind === "borrowed" ? "Borrowed loan added" : "Loan you gave added");
      onClose();
      setName(""); setPerson(""); setPrincipal(""); setRate("0"); setEmi(""); setNotes("");
      setStartDate(todayISO()); setTenure("12");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not add the loan", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label="Add a loan" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div><p className="eyebrow">Loan tracking</p><h2>Add a loan</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <div className="segmented" role="group" aria-label="Loan direction">
            <button type="button" className={kind === "borrowed" ? "active" : ""} onClick={() => setKind("borrowed")}>I borrowed</button>
            <button type="button" className={kind === "lent" ? "active" : ""} onClick={() => setKind("lent")}>I lent</button>
          </div>
          <div className="field-row">
            <label className="field"><span>Loan name</span><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home loan, Car loan or Gold loan" /></label>
            <label className="field"><span>Bank / person</span><input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="e.g. City Bank" /></label>
          </div>
          <div className="field-row">
            <label className="field"><span>Principal (₹)</span><input required type="number" min="1" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="180000" /></label>
            <label className="field"><span>Interest rate (p.a.)</span><input type="number" min="0" max="100" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
          </div>
          <div className="field-row">
            <label className="field"><span>Start date</span><input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
            <label className="field"><span>Tenure (months)</span><input required type="number" min="1" max="600" value={tenure} onChange={(e) => setTenure(e.target.value)} /></label>
          </div>
          <label className="field">
            <span>Custom EMI (₹) <em>optional</em></span>
            <input type="number" min="0" step="0.01" value={emi} onChange={(e) => setEmi(e.target.value)} placeholder={`Calculated: ${formatMoney(computedEmi, true)}`} />
          </label>
          <label className="field"><span>Notes <em>optional</em></span><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any detail worth remembering" /></label>
          <div className="modal__hint">Estimated EMI: <strong>{formatMoney(emi ? toPaise(Number(emi)) : computedEmi, true)}</strong> per month, split between principal and interest.</div>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Saving…" : "Add loan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentDialog({
  loan,
  onClose,
  members,
  currentUserId,
  notify,
}: {
  loan: Loan | null;
  onClose: () => void;
  members: Member[];
  currentUserId: string;
  notify: (message: string, tone?: "success" | "error") => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [memberId, setMemberId] = useState(currentUserId);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function close() {
    setAmount(""); setNote(""); setPaidOn(todayISO());
    onClose();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!loan) return;
    setSaving(true);
    try {
      const result = await api<{ principal: number; interest: number }>(
        `/api/loans/${loan.id}/payments`,
        body({ amountRupees: Number(amount), paidOn, memberId, note }),
      );
      notify(`Payment saved · ${formatMoney(result.principal)} principal`);
      close();
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save the payment", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!loan) return null;
  return (
    <div className="modal-backdrop" onMouseDown={close} role="presentation">
      <div className="modal modal--narrow" role="dialog" aria-modal="true" aria-label="Record a payment" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div><p className="eyebrow">{loan.name}</p><h2>Record a payment</h2></div>
          <button className="icon-btn" onClick={close} aria-label="Close"><X size={18} /></button>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <div className="modal__hint">Outstanding on this loan: <strong>{formatMoney(loan.outstanding)}</strong></div>
          <label className="field"><span>Amount (₹)</span><input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></label>
          <div className="field-row">
            <label className="field"><span>Date</span><input required type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></label>
            <label className="field"><span>Paid by</span><select value={memberId} onChange={(e) => setMemberId(e.target.value)}>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          </div>
          <label className="field"><span>Note <em>optional</em></span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly EMI" /></label>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={close}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Saving…" : "Save payment"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

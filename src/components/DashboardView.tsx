"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Landmark,
  Percent,
  Plus,
  Wallet,
} from "lucide-react";
import { useApp } from "./AppContext";
import { LoanClosurePanel } from "./LoanClosurePanel";
import { MonthSwitcher } from "./MonthSwitcher";
import { CategoryDonut } from "./charts/CategoryDonut";
import { TrendChart } from "./charts/TrendChart";
import { colorForCategory } from "@/lib/categories";
import { formatDate, monthLabel } from "@/lib/dates";
import { formatCompact, formatMoney, formatPercent } from "@/lib/money";
import type { Summary } from "@/lib/types";

function Delta({ current, previous, flip = false }: { current: number; previous: number; flip?: boolean }) {
  if (previous <= 0) return <span className="delta delta--flat">No prior month</span>;
  const change = ((current - previous) / previous) * 100;
  const good = flip ? change <= 0 : change >= 0;
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`delta ${good ? "delta--good" : "delta--bad"}`}>
      <Icon size={13} /> {Math.abs(change).toFixed(0)}% vs last month
    </span>
  );
}

export function DashboardView({ summary }: { summary: Summary }) {
  const { openQuickAdd } = useApp();
  const { income, expense, net, loans } = summary;
  const max = Math.max(income, expense, 1);
  const savingsRate = income > 0 ? (net / income) * 100 : 0;
  const insights = summary.loanInsights.avalanche;

  return (
    <div className="dashboard">
      <div className="page-tools">
        <MonthSwitcher month={summary.month} />
        <div className="page-tools__actions">
          <button
            className="btn btn--quiet"
            onClick={() => openQuickAdd({ type: "income" })}
          >
            <Plus size={16} /> Income
          </button>
          <button
            className="btn btn--quiet"
            onClick={() => openQuickAdd({ type: "expense" })}
          >
            <Plus size={16} /> Expense
          </button>
        </div>
      </div>

      <section className="cashflow">
        <div className="cashflow__head">
          <div>
            <p className="eyebrow">The month at a glance</p>
            <h2>{monthLabel(summary.month)}</h2>
          </div>
          <span className="cashflow__net">
            {net >= 0 ? "Left over" : "Over budget by"}
            <strong className={net >= 0 ? "positive" : "negative"}>
              {formatMoney(Math.abs(net))}
            </strong>
          </span>
        </div>

        <div className="cashflow__body">
          <div className="cashflow__side">
            <span className="cashflow__label">Money in</span>
            <strong>{formatCompact(income)}</strong>
            <Delta current={income} previous={summary.prevIncome} />
          </div>
          <div className="cashflow__bars">
            <div className="flowbar">
              <div className="flowbar__track">
                <div className="flowbar__fill flowbar__fill--income" style={{ width: `${(income / max) * 100}%` }} />
              </div>
            </div>
            <div className="flowbar">
              <div className="flowbar__track">
                <div className="flowbar__fill flowbar__fill--expense" style={{ width: `${(expense / max) * 100}%` }} />
              </div>
            </div>
            <div className="cashflow__scale">
              <span>Savings rate</span>
              <strong>{savingsRate.toFixed(0)}%</strong>
            </div>
          </div>
          <div className="cashflow__side cashflow__side--right">
            <span className="cashflow__label">Money out</span>
            <strong>{formatCompact(expense)}</strong>
            <Delta current={expense} previous={summary.prevExpense} flip />
          </div>
        </div>
      </section>

      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi__icon"><Landmark size={18} /></span>
          <div>
            <span className="kpi__label">Borrowed outstanding</span>
            <strong>{formatCompact(loans.outstandingBorrowed)}</strong>
          </div>
        </div>
        <div className="kpi">
          <span className="kpi__icon"><Wallet size={18} /></span>
          <div>
            <span className="kpi__label">Monthly EMI commitment</span>
            <strong>{formatCompact(loans.monthlyEmi)}</strong>
          </div>
        </div>
        <div className="kpi">
          <span className="kpi__icon"><Percent size={18} /></span>
          <div>
            <span className="kpi__label">EMI as share of income</span>
            <strong>{insights.totalEmi > 0 ? formatPercent(insights.emiBurdenPercent) : "—"}</strong>
          </div>
        </div>
        <div className="kpi">
          <span className="kpi__icon"><CalendarClock size={18} /></span>
          <div>
            <span className="kpi__label">Debt-free target</span>
            <strong>
              {insights.debtFreeMonthWithExtra ? monthLabel(insights.debtFreeMonthWithExtra) : "—"}
            </strong>
          </div>
        </div>
      </div>

      <LoanClosurePanel insights={summary.loanInsights} />

      <div className="dashboard__pair">
        <section className="panel panel--trend">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Six-month rhythm</p>
              <h3>Income against spending</h3>
            </div>
            <div className="chart-key">
              <span><i className="chart-key__dot chart-key__dot--income" /> Income</span>
              <span><i className="chart-key__dot chart-key__dot--expense" /> Spent</span>
            </div>
          </div>
          <TrendChart data={summary.monthlySeries} />
        </section>

        <section className="panel">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Where it went</p>
              <h3>Spending split</h3>
            </div>
          </div>
          <CategoryDonut data={summary.categoryTotals} total={expense} />
        </section>
      </div>

      <div className="dashboard__pair">
        <section className="panel">
          <div className="panel__head">
            <div>
              <p className="eyebrow">The usual suspects</p>
              <h3>Groceries, fuel & school fees</h3>
            </div>
          </div>
          <div className="spotlight-grid">
            {summary.spotlights.map((item) => (
              <div className="spotlight" key={item.category}>
                <span className="spotlight__dot" style={{ background: colorForCategory(item.category) }} />
                <span className="spotlight__name">{item.category}</span>
                <strong>{formatCompact(item.amount)}</strong>
                <Delta current={item.amount} previous={item.prevAmount} flip />
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Monthly limits</p>
              <h3>Budget tracking</h3>
            </div>
            <Link href="/budgets" className="text-link">All budgets</Link>
          </div>
          {summary.budgets.length === 0 ? (
            <div className="empty-inline">
              <p>No budgets set for {monthLabel(summary.month)}.</p>
              <Link href="/budgets" className="btn btn--quiet">Set a budget</Link>
            </div>
          ) : (
            <ul className="progress-list">
              {summary.budgets.slice(0, 4).map((budget) => (
                <li key={budget.id}>
                  <div className="progress-list__top">
                    <span>{budget.category}</span>
                    <span>{formatCompact(budget.spent)} / {formatCompact(budget.amount)}</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${budget.percent > 100 ? "progress-fill--over" : ""}`}
                      style={{
                        width: `${Math.min(100, budget.percent)}%`,
                        background: colorForCategory(budget.category),
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="dashboard__pair">
        <section className="panel">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Fresh entries</p>
              <h3>Recent activity</h3>
            </div>
            <Link href="/transactions" className="text-link">View all</Link>
          </div>
          {summary.recentTransactions.length === 0 ? (
            <div className="empty-inline">
              <p>Nothing recorded yet. Start with one entry.</p>
              <button className="btn btn--quiet" onClick={() => openQuickAdd()}>
                <Plus size={15} /> Add entry
              </button>
            </div>
          ) : (
            <ul className="activity-list">
              {summary.recentTransactions.map((tx) => (
                <li key={tx.id}>
                  <span className="activity-list__mark" style={{ background: colorForCategory(tx.category) }} />
                  <div className="activity-list__body">
                    <strong>{tx.note || tx.category}</strong>
                    <span>{tx.category} · {tx.memberName} · {formatDate(tx.occurredOn)}</span>
                  </div>
                  <span className={`activity-list__amount ${tx.type === "income" ? "positive" : ""}`}>
                    {tx.type === "income" ? "+" : "−"}{formatMoney(tx.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Coming up</p>
              <h3>Loan payments</h3>
            </div>
            <Link href="/loans" className="text-link">Manage loans</Link>
          </div>
          {loans.upcoming.length === 0 ? (
            <div className="empty-inline">
              <p>No active loan payments on the calendar.</p>
              <Link href="/loans" className="btn btn--quiet">Add a loan</Link>
            </div>
          ) : (
            <ul className="due-list">
              {loans.upcoming.slice(0, 4).map((loan) => (
                <li key={loan.id}>
                  <div>
                    <strong>{loan.name}</strong>
                    <span>{loan.kind === "borrowed" ? "EMI to pay" : "Expected back"} · {formatDate(loan.dueDate)}</span>
                  </div>
                  <span className="due-list__amount">{formatMoney(loan.emi)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

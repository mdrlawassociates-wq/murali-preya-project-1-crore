"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Info, Sparkles, TrendingDown } from "lucide-react";
import { monthLabel } from "@/lib/dates";
import type { LoanInsightsBundle, LoanStrategy } from "@/lib/loan-advice";
import { formatCompact, formatMoney } from "@/lib/money";

interface Props {
  insights: LoanInsightsBundle;
}

export function LoanClosurePanel({ insights }: Props) {
  const [strategy, setStrategy] = useState<LoanStrategy>("avalanche");
  const data = insights[strategy];
  const recommended = data.recommended;
  const hasLoans = data.plans.length > 0;

  return (
    <section className="panel loan-plan">
      <div className="panel__head loan-plan__head">
        <div>
          <p className="eyebrow">Loan closure plan</p>
          <h3>Clear the loan that costs you most</h3>
        </div>
        <div className="strategy-toggle" role="group" aria-label="Loan payoff strategy">
          <button
            type="button"
            className={strategy === "avalanche" ? "active" : ""}
            aria-pressed={strategy === "avalanche"}
            onClick={() => setStrategy("avalanche")}
          >
            <TrendingDown size={14} /> Save most interest
          </button>
          <button
            type="button"
            className={strategy === "snowball" ? "active" : ""}
            aria-pressed={strategy === "snowball"}
            onClick={() => setStrategy("snowball")}
          >
            <Sparkles size={14} /> Quickest win
          </button>
        </div>
      </div>

      {!hasLoans || !recommended ? (
        <div className="loan-plan__empty">
          <span className="loan-plan__empty-icon"><CalendarClock size={20} /></span>
          <div>
            <strong>No active borrowed loans to plan for</strong>
            <p>Add a home, car, gold or personal loan and this panel will rank what to clear first.</p>
          </div>
          <Link href="/loans" className="btn btn--quiet btn--sm">Add a loan</Link>
        </div>
      ) : (
        <>
          <div className="loan-plan__hero">
            <span className="loan-plan__rank">01</span>
            <div className="loan-plan__hero-main">
              <span className="loan-plan__category">
                {recommended.category} · {recommended.annualRate}% p.a.
              </span>
              <strong>{recommended.name}</strong>
              <p>{recommended.reason}</p>
            </div>
            <div className="loan-plan__hero-figure">
              <span>Outstanding</span>
              <strong>{formatCompact(recommended.outstanding)}</strong>
              <small>Current EMI {formatCompact(recommended.emi)}/mo</small>
            </div>
          </div>

          <div className="loan-plan__metrics">
            <div>
              <span>Extra you could add</span>
              <strong>{formatMoney(data.suggestedExtra)}</strong>
              <small>{data.suggestedExtra > 0 ? "per month, if affordable" : "no surplus this month"}</small>
            </div>
            <div>
              <span>Interest saved</span>
              <strong className="positive">{formatCompact(data.totalInterestSaved)}</strong>
              <small>across all loans</small>
            </div>
            <div>
              <span>Debt-free target</span>
              <strong>
                {data.debtFreeMonthWithExtra ? monthLabel(data.debtFreeMonthWithExtra) : "Raise EMI"}
              </strong>
              <small>
                {data.monthsSaved > 0
                  ? `${data.monthsSaved} months earlier than current EMIs`
                  : data.debtFreeMonth
                    ? `current EMIs end ${monthLabel(data.debtFreeMonth)}`
                    : "current EMI will not clear the balance"}
              </small>
            </div>
            <div>
              <span>Left after EMIs</span>
              <strong className={data.surplus >= 0 ? "positive" : "negative"}>
                {formatCompact(data.surplus)}
              </strong>
              <small>this month&apos;s surplus</small>
            </div>
          </div>

          <div className="loan-plan__list-head">
            <span>Priority order</span>
            <span>Outstanding · Interest · Timeline</span>
          </div>
          <ol className="loan-plan__list">
            {data.plans.slice(0, 4).map((plan) => (
              <li key={plan.loanId} className={plan.rank === 1 ? "loan-plan__item--first" : ""}>
                <span className="loan-plan__item-rank">{String(plan.rank).padStart(2, "0")}</span>
                <div className="loan-plan__item-name">
                  <strong>{plan.name}</strong>
                  <span>{plan.category} · {plan.annualRate}% p.a.</span>
                </div>
                <span className="loan-plan__item-value">{formatCompact(plan.outstanding)}</span>
                <span className="loan-plan__item-value">
                  {plan.feasible
                    ? `${plan.monthsRemaining} mo${plan.monthsSaved > 0 ? ` → ${plan.monthsWithExtra}` : ""}`
                    : "EMI too low"}
                </span>
              </li>
            ))}
          </ol>

          {data.surplus <= 0 && (
            <p className="loan-plan__warning">
              Your income minus spending and EMIs is not positive this month. Even a small
              pre-payment can shorten the timeline, but protect your essentials first.
            </p>
          )}

          <div className="loan-plan__foot">
            <span className="loan-plan__disclaimer">
              <Info size={13} /> Estimates use reducing-balance interest and your current figures.
              They are guidance, not financial advice.
            </span>
            <Link href="/loans" className="text-link">
              Manage loans <ArrowRight size={14} />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

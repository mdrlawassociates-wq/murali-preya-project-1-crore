import { shiftMonth } from "./dates";
import { calculateEmi } from "./money";
import type { Loan } from "./types";

export type LoanStrategy = "avalanche" | "snowball";

export interface LoanClosurePlan {
  loanId: string;
  name: string;
  category: string;
  kind: Loan["kind"];
  annualRate: number;
  outstanding: number;
  emi: number;
  monthsRemaining: number;
  interestRemaining: number;
  extraPerMonth: number;
  monthsWithExtra: number;
  interestSaved: number;
  monthsSaved: number;
  rank: number;
  reason: string;
  feasible: boolean;
  projectedEndMonth: string | null;
  projectedEndMonthWithExtra: string | null;
}

export interface LoanInsights {
  plans: LoanClosurePlan[];
  recommended: LoanClosurePlan | null;
  totalOutstanding: number;
  totalEmi: number;
  emiBurdenPercent: number;
  surplus: number;
  suggestedExtra: number;
  debtFreeMonth: string | null;
  debtFreeMonthWithExtra: string | null;
  totalInterestSaved: number;
  monthsSaved: number;
  strategy: LoanStrategy;
}

export interface LoanInsightsBundle {
  avalanche: LoanInsights;
  snowball: LoanInsights;
}

/** Human label for a loan, inferred from its name (home/car/gold/etc.). */
export function loanCategory(name: string): string {
  const value = ` ${name.toLowerCase()} `;
  if (/home|house|housing|flat|property/.test(value)) return "Home loan";
  if (/car|vehicle|auto/.test(value)) return "Car loan";
  if (/gold|jewel|ornament/.test(value)) return "Gold loan";
  if (/bike|scooter|two.?wheeler|motorcycle/.test(value)) return "Bike loan";
  if (/education|student|college|tuition|school.?fee/.test(value)) return "Education loan";
  if (/personal|credit card|credit/.test(value)) return "Personal loan";
  return "Other loan";
}

interface Projection {
  months: number;
  interest: number;
  feasible: boolean;
}

interface Simulation {
  months: number;
  interest: number;
}

/** Reducing-balance payoff projection. `payment` and result are in paise. */
function project(principal: number, annualRate: number, payment: number): Projection {
  if (principal <= 0) return { months: 0, interest: 0, feasible: true };
  const monthlyRate = annualRate / 1200;
  let balance = principal;
  let interestPaid = 0;
  let months = 0;

  while (balance > 0 && months < 600) {
    const interest = Math.round(balance * monthlyRate);
    if (payment <= interest) return { months: 600, interest: interestPaid, feasible: false };
    const principalPart = Math.min(balance, payment - interest);
    interestPaid += interest;
    balance -= principalPart;
    months += 1;
  }

  return { months, interest: interestPaid, feasible: balance <= 0 };
}

/**
 * Month-by-month household simulation. Every active loan gets its EMI; any
 * extra cash (and freed EMIs from closed loans) goes to the priority loan.
 */
function simulate(loans: Loan[], extra: number, strategy: LoanStrategy): Simulation {
  const active = loans.filter(
    (loan) => loan.kind === "borrowed" && loan.status === "active" && loan.outstanding > 0,
  );
  if (active.length === 0) return { months: 0, interest: 0 };

  const state = active.map((loan) => ({
    balance: loan.outstanding,
    rate: loan.annualRate,
    emi:
      loan.emi > 0
        ? loan.emi
        : calculateEmi(loan.outstanding, loan.annualRate, loan.tenureMonths),
    name: loan.name,
  }));

  const order = state
    .map((_, index) => index)
    .sort((a, b) =>
      strategy === "avalanche"
        ? state[b].rate - state[a].rate || state[b].balance - state[a].balance
        : state[a].balance - state[b].balance || state[b].rate - state[a].rate,
    );

  let months = 0;
  let interest = 0;

  while (state.some((loan) => loan.balance > 0) && months < 600) {
    let freeCash = extra;

    for (const loan of state) {
      if (loan.balance <= 0) continue;
      const due = Math.round((loan.balance * loan.rate) / 1200);
      interest += due;
      loan.balance += due;
      const payment = Math.min(loan.emi, loan.balance);
      loan.balance -= payment;
      freeCash += Math.max(0, loan.emi - payment);
    }

    for (const index of order) {
      if (freeCash <= 0) break;
      const loan = state[index]!;
      if (loan.balance <= 0) continue;
      const payment = Math.min(freeCash, loan.balance);
      loan.balance -= payment;
      freeCash -= payment;
    }

    months += 1;
  }

  return { months, interest };
}

function roundUpTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export function buildLoanInsights(
  loans: Loan[],
  income: number,
  expense: number,
  month: string,
  strategy: LoanStrategy = "avalanche",
): LoanInsights {
  const borrowed = loans.filter((loan) => loan.kind === "borrowed" && loan.status === "active");
  const totalOutstanding = borrowed.reduce((sum, loan) => sum + loan.outstanding, 0);
  const totalEmi = borrowed
    .filter((loan) => loan.outstanding > 0)
    .reduce((sum, loan) => sum + loan.emi, 0);
  const surplus = income - expense - totalEmi;
  const emiBurdenPercent = income > 0 ? (totalEmi / income) * 100 : 0;

  const ranked = [...borrowed]
    .filter((loan) => loan.outstanding > 0)
    .sort((a, b) =>
      strategy === "avalanche"
        ? b.annualRate - a.annualRate || b.outstanding - a.outstanding
        : a.outstanding - b.outstanding || b.annualRate - a.annualRate,
    );

  const step = 50000; // ₹500
  const rawExtra = Math.min(surplus * 0.25, totalEmi > 0 ? totalEmi * 0.3 : surplus * 0.25);
  const affordableExtra = Math.floor(Math.max(0, surplus) / step) * step;
  const suggestedExtra = Math.min(roundUpTo(Math.max(0, rawExtra), step), affordableExtra);

  const plans: LoanClosurePlan[] = ranked.map((loan, index) => {
    const payment =
      loan.emi > 0 ? loan.emi : calculateEmi(loan.outstanding, loan.annualRate, loan.tenureMonths);
    const current = project(loan.outstanding, loan.annualRate, payment);
    const faster =
      suggestedExtra > 0 ? project(loan.outstanding, loan.annualRate, payment + suggestedExtra) : current;
    const category = loanCategory(loan.name);
    const reason =
      strategy === "avalanche"
        ? index === 0
          ? `This ${category.toLowerCase()} carries the highest rate at ${loan.annualRate}% p.a., so clearing it first saves the most interest.`
          : `${loan.annualRate}% p.a. interest. Lower priority than the higher-rate loans above.`
        : index === 0
          ? `Smallest balance at about ₹${Math.round(loan.outstanding / 100).toLocaleString("en-IN")} — a quick win that frees up ${Math.round(payment / 100).toLocaleString("en-IN")} per month.`
          : `Larger balance, so it follows the smaller loans in this strategy.`;

    return {
      loanId: loan.id,
      name: loan.name,
      category,
      kind: loan.kind,
      annualRate: loan.annualRate,
      outstanding: loan.outstanding,
      emi: payment,
      monthsRemaining: current.months,
      interestRemaining: current.feasible ? current.interest : 0,
      extraPerMonth: suggestedExtra,
      monthsWithExtra: faster.months,
      interestSaved:
        current.feasible && faster.feasible ? Math.max(0, current.interest - faster.interest) : 0,
      monthsSaved:
        current.feasible && faster.feasible ? Math.max(0, current.months - faster.months) : 0,
      rank: index + 1,
      reason,
      feasible: current.feasible,
      projectedEndMonth: current.feasible ? shiftMonth(month, current.months) : null,
      projectedEndMonthWithExtra: faster.feasible ? shiftMonth(month, faster.months) : null,
    };
  });

  const baseline = simulate(loans, 0, strategy);
  const accelerated = simulate(loans, suggestedExtra, strategy);
  const withinHorizon = (months: number) => months > 0 && months < 600;

  return {
    plans,
    recommended: plans[0] ?? null,
    totalOutstanding,
    totalEmi,
    emiBurdenPercent,
    surplus,
    suggestedExtra,
    debtFreeMonth: withinHorizon(baseline.months) ? shiftMonth(month, baseline.months) : null,
    debtFreeMonthWithExtra: withinHorizon(accelerated.months)
      ? shiftMonth(month, accelerated.months)
      : null,
    totalInterestSaved: Math.max(0, baseline.interest - accelerated.interest),
    monthsSaved: Math.max(0, baseline.months - accelerated.months),
    strategy,
  };
}

export function buildLoanInsightsBundle(
  loans: Loan[],
  income: number,
  expense: number,
  month: string,
): LoanInsightsBundle {
  return {
    avalanche: buildLoanInsights(loans, income, expense, month, "avalanche"),
    snowball: buildLoanInsights(loans, income, expense, month, "snowball"),
  };
}

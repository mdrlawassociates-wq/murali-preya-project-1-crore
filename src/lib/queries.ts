import "server-only";

import { db } from "./db";
import { addMonthsToDate, shiftMonth } from "./dates";
import { buildLoanInsightsBundle } from "./loan-advice";
import type {
  Budget,
  BudgetWithSpend,
  Loan,
  LoanPayment,
  Member,
  MonthlyPoint,
  Summary,
  Transaction,
} from "./types";

interface TransactionRow {
  id: string;
  member_id: string;
  member_name: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  occurred_on: string;
  note: string;
  created_at: number;
}

interface LoanRow {
  id: string;
  kind: "borrowed" | "lent";
  name: string;
  person: string;
  principal: number;
  annual_rate: number;
  start_date: string;
  tenure_months: number;
  emi: number;
  status: "active" | "closed";
  notes: string;
  created_at: number;
  paid: number;
  payment_count: number;
}

interface PaymentRow {
  id: string;
  loan_id: string;
  member_id: string;
  member_name: string;
  amount: number;
  paid_on: string;
  principal_component: number;
  interest_component: number;
  note: string;
  created_at: number;
}

export function getMembers(householdId: string): Member[] {
  return db
    .prepare("SELECT id, name FROM people WHERE household_id = ? ORDER BY created_at")
    .all(householdId) as Member[];
}

export function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    type: row.type,
    category: row.category,
    amount: row.amount,
    occurredOn: row.occurred_on,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function listTransactions(householdId: string, limit = 1000): Transaction[] {
  const rows = db
    .prepare(
      `SELECT t.*, p.name AS member_name
       FROM transactions t
       JOIN people p ON p.id = t.member_id
       WHERE t.household_id = ?
       ORDER BY t.occurred_on DESC, t.created_at DESC
       LIMIT ?`,
    )
    .all(householdId, limit) as TransactionRow[];
  return rows.map(mapTransaction);
}

export function getTransaction(householdId: string, id: string): Transaction | null {
  const row = db
    .prepare(
      `SELECT t.*, p.name AS member_name
       FROM transactions t JOIN people p ON p.id = t.member_id
       WHERE t.household_id = ? AND t.id = ?`,
    )
    .get(householdId, id) as TransactionRow | undefined;
  return row ? mapTransaction(row) : null;
}

export function mapLoan(row: LoanRow): Loan {
  const outstanding = Math.max(0, row.principal - row.paid);
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    person: row.person,
    principal: row.principal,
    annualRate: row.annual_rate,
    startDate: row.start_date,
    tenureMonths: row.tenure_months,
    emi: row.emi,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    paid: row.paid,
    outstanding,
    progress: row.principal > 0 ? Math.min(100, (row.paid / row.principal) * 100) : 0,
    nextDueDate:
      row.status === "active" && row.payment_count < row.tenure_months
        ? addMonthsToDate(row.start_date, row.payment_count + 1)
        : null,
    paymentCount: row.payment_count,
  };
}

const LOAN_SELECT = `
  SELECT l.*,
         COALESCE(SUM(p.principal_component), 0) AS paid,
         COUNT(p.id) AS payment_count
  FROM loans l
  LEFT JOIN loan_payments p ON p.loan_id = l.id
`;

export function listLoans(householdId: string): Loan[] {
  const rows = db
    .prepare(
      `${LOAN_SELECT}
       WHERE l.household_id = ?
       GROUP BY l.id
       ORDER BY CASE WHEN l.status = 'active' THEN 0 ELSE 1 END, l.start_date DESC`,
    )
    .all(householdId) as LoanRow[];
  return rows.map(mapLoan);
}

export function getLoan(householdId: string, id: string): Loan | null {
  const row = db
    .prepare(`${LOAN_SELECT} WHERE l.household_id = ? AND l.id = ? GROUP BY l.id`)
    .get(householdId, id) as LoanRow | undefined;
  return row ? mapLoan(row) : null;
}

export function listPayments(householdId: string): LoanPayment[] {
  const rows = db
    .prepare(
      `SELECT p.*, person.name AS member_name
       FROM loan_payments p
       JOIN loans l ON l.id = p.loan_id
       JOIN people person ON person.id = p.member_id
       WHERE l.household_id = ?
       ORDER BY p.paid_on DESC, p.created_at DESC`,
    )
    .all(householdId) as PaymentRow[];
  return rows.map((row) => ({
    id: row.id,
    loanId: row.loan_id,
    memberId: row.member_id,
    memberName: row.member_name,
    amount: row.amount,
    paidOn: row.paid_on,
    principalComponent: row.principal_component,
    interestComponent: row.interest_component,
    note: row.note,
    createdAt: row.created_at,
  }));
}

export function listBudgets(householdId: string, month: string): Budget[] {
  return db
    .prepare(
      "SELECT id, category, month, amount FROM budgets WHERE household_id = ? AND month = ? ORDER BY category",
    )
    .all(householdId, month) as Budget[];
}

export function getSummary(householdId: string, month: string): Summary {
  const start = `${shiftMonth(month, -5)}-01`;
  const end = `${month}-31`;
  const rows = db
    .prepare(
      `SELECT occurred_on, type, category, member_id, amount
       FROM transactions
       WHERE household_id = ? AND occurred_on >= ? AND occurred_on <= ?`,
    )
    .all(householdId, start, end) as Array<{
    occurred_on: string;
    type: "income" | "expense";
    category: string;
    member_id: string;
    amount: number;
  }>;

  const byMonth = new Map<string, MonthlyPoint>();
  for (let i = -5; i <= 0; i += 1) {
    const key = shiftMonth(month, i);
    byMonth.set(key, { month: key, income: 0, expense: 0 });
  }

  let income = 0;
  let expense = 0;
  let prevIncome = 0;
  let prevExpense = 0;
  const categoryMap = new Map<string, number>();
  const memberMap = new Map<string, number>();
  const prevMonth = shiftMonth(month, -1);

  for (const row of rows) {
    const key = row.occurred_on.slice(0, 7);
    const point = byMonth.get(key);
    if (point) point[row.type] += row.amount;

    if (key === month) {
      if (row.type === "income") income += row.amount;
      else {
        expense += row.amount;
        categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + row.amount);
        memberMap.set(row.member_id, (memberMap.get(row.member_id) ?? 0) + row.amount);
      }
    } else if (key === prevMonth) {
      if (row.type === "income") prevIncome += row.amount;
      else prevExpense += row.amount;
    }
  }

  const members = getMembers(householdId);
  const memberSpend = members
    .map((member) => ({
      memberId: member.id,
      name: member.name,
      amount: memberMap.get(member.id) ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const categoryTotals = Array.from(categoryMap, ([category, amount]) => ({ category, amount })).sort(
    (a, b) => b.amount - a.amount,
  );

  const prevCategoryTotals = new Map<string, number>();
  for (const row of rows) {
    if (row.occurred_on.startsWith(prevMonth) && row.type === "expense") {
      prevCategoryTotals.set(row.category, (prevCategoryTotals.get(row.category) ?? 0) + row.amount);
    }
  }

  const budgets: BudgetWithSpend[] = listBudgets(householdId, month).map((budget) => {
    const spent = categoryMap.get(budget.category) ?? 0;
    return {
      ...budget,
      spent,
      remaining: budget.amount - spent,
      percent: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
    };
  });

  const loans = listLoans(householdId);
  const activeLoans = loans.filter((loan) => loan.status === "active");

  return {
    month,
    income,
    expense,
    net: income - expense,
    prevIncome,
    prevExpense,
    categoryTotals,
    monthlySeries: Array.from(byMonth.values()),
    memberSpend,
    spotlights: ["Groceries", "Fuel", "School Fees"].map((category) => ({
      category,
      amount: categoryMap.get(category) ?? 0,
      prevAmount: prevCategoryTotals.get(category) ?? 0,
    })),
    loans: {
      outstandingBorrowed: activeLoans
        .filter((loan) => loan.kind === "borrowed")
        .reduce((sum, loan) => sum + loan.outstanding, 0),
      outstandingLent: activeLoans
        .filter((loan) => loan.kind === "lent")
        .reduce((sum, loan) => sum + loan.outstanding, 0),
      monthlyEmi: activeLoans
        .filter((loan) => loan.kind === "borrowed" && loan.outstanding > 0)
        .reduce((sum, loan) => sum + loan.emi, 0),
      activeCount: activeLoans.length,
      upcoming: activeLoans
        .filter((loan) => loan.outstanding > 0 && loan.nextDueDate)
        .map((loan) => ({
          id: loan.id,
          name: loan.name,
          kind: loan.kind,
          dueDate: loan.nextDueDate as string,
          emi: loan.emi,
        }))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    },
    recentTransactions: listTransactions(householdId, 6),
    budgets,
    loanInsights: buildLoanInsightsBundle(loans, income, expense, month),
  };
}

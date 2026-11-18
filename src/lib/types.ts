import type { LoanInsightsBundle } from "./loan-advice";

export type TxType = "income" | "expense";
export type LoanKind = "borrowed" | "lent";
export type LoanStatus = "active" | "closed";

export interface Household {
  id: string;
  name: string;
  currency: "INR";
}

/** A person in the household. People are labels for entries, not logins. */
export interface Member {
  id: string;
  name: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  household: Household;
}

export interface AuthContext {
  user: AuthUser;
  household: Household;
  members: Member[];
}

export interface Transaction {
  id: string;
  memberId: string;
  memberName: string;
  type: TxType;
  category: string;
  amount: number;
  occurredOn: string;
  note: string;
  createdAt: number;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  memberId: string;
  memberName: string;
  amount: number;
  paidOn: string;
  principalComponent: number;
  interestComponent: number;
  note: string;
  createdAt: number;
}

export interface Loan {
  id: string;
  kind: LoanKind;
  name: string;
  person: string;
  principal: number;
  annualRate: number;
  startDate: string;
  tenureMonths: number;
  emi: number;
  status: LoanStatus;
  notes: string;
  createdAt: number;
  paid: number;
  outstanding: number;
  progress: number;
  nextDueDate: string | null;
  paymentCount: number;
}

export interface Budget {
  id: string;
  category: string;
  month: string;
  amount: number;
}

export interface BudgetWithSpend extends Budget {
  spent: number;
  remaining: number;
  percent: number;
}

export interface CategoryTotal {
  category: string;
  amount: number;
}

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
}

export interface MemberSpend {
  memberId: string;
  name: string;
  amount: number;
}

export interface UpcomingLoan {
  id: string;
  name: string;
  kind: LoanKind;
  dueDate: string;
  emi: number;
}

export interface Summary {
  month: string;
  income: number;
  expense: number;
  net: number;
  prevIncome: number;
  prevExpense: number;
  categoryTotals: CategoryTotal[];
  monthlySeries: MonthlyPoint[];
  memberSpend: MemberSpend[];
  spotlights: Array<{ category: string; amount: number; prevAmount: number }>;
  loans: {
    outstandingBorrowed: number;
    outstandingLent: number;
    monthlyEmi: number;
    activeCount: number;
    upcoming: UpcomingLoan[];
  };
  recentTransactions: Transaction[];
  budgets: BudgetWithSpend[];
  loanInsights: LoanInsightsBundle;
}

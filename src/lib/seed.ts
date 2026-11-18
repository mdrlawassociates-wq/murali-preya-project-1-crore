import "server-only";

import { randomUUID } from "node:crypto";
import { db } from "./db";
import { shiftMonth, monthKey } from "./dates";
import { calculateEmi, splitPayment, toPaise } from "./money";

function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hasData(householdId: string): boolean {
  const row = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM transactions WHERE household_id = ?)
        + (SELECT COUNT(*) FROM loans WHERE household_id = ?) AS total`,
    )
    .get(householdId, householdId) as { total: number };
  return row.total > 0;
}

export function seedSampleData(householdId: string, memberIds: string[]): void {
  if (!memberIds.length) return;

  db.transaction(() => {
  const rand = mulberry32(20261118);
  const now = Date.now();
  const primary = memberIds[0];
  const partner = memberIds[1] ?? primary;

  const insertTx = db.prepare(
    `INSERT INTO transactions
      (id, household_id, member_id, type, category, amount, occurred_on, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const add = (
    month: string,
    day: number,
    type: "income" | "expense",
    category: string,
    rupees: number,
    member: string,
    note: string,
  ) => {
    const iso = `${month}-${String(Math.min(day, 28)).padStart(2, "0")}`;
    insertTx.run(
      randomUUID(),
      householdId,
      member,
      type,
      category,
      toPaise(rupees),
      iso,
      note,
      now,
    );
  };

  const current = monthKey();

  for (let offset = -3; offset <= 0; offset += 1) {
    const month = shiftMonth(current, offset);

    add(month, 1, "income", "Salary", 185000 + Math.round(rand() * 12000), primary, "Monthly salary");
    if (offset !== -3) {
      add(month, 12, "income", "Freelance", 18000 + Math.round(rand() * 22000), partner, "Design project");
    }

    add(month, 2, "expense", "Rent", 32000, primary, "House rent");
    add(month, 5, "expense", "Groceries", 8200 + Math.round(rand() * 4500), partner, "Weekly vegetables and staples");
    add(month, 13, "expense", "Groceries", 7400 + Math.round(rand() * 3800), primary, "Monthly grocery run");
    add(month, 21, "expense", "Groceries", 5200 + Math.round(rand() * 2600), partner, "Fruits and dairy");
    add(month, 7, "expense", "Fuel", 4200 + Math.round(rand() * 1800), primary, "Car fuel");
    add(month, 19, "expense", "Fuel", 1800 + Math.round(rand() * 900), partner, "Scooter fuel");
    add(month, 6, "expense", "School Fees", 9800, primary, "School fee and bus");
    add(month, 8, "expense", "Utilities", 3400 + Math.round(rand() * 1600), partner, "Current bill and internet");
    add(month, 11, "expense", "Dining Out", 2400 + Math.round(rand() * 2600), partner, "Family dinner");
    add(month, 16, "expense", "Transport", 1600 + Math.round(rand() * 1200), primary, "Metro and cab");
    add(month, 23, "expense", "Shopping", 3200 + Math.round(rand() * 5200), partner, "Household items");
    if (offset % 2 === 0) {
      add(month, 25, "expense", "Health", 2100 + Math.round(rand() * 2400), primary, "Pharmacy and checkup");
    }
  }

  const insertLoan = db.prepare(
    `INSERT INTO loans
      (id, household_id, kind, name, person, principal, annual_rate, start_date,
       tenure_months, emi, status, notes, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
  );
  const insertPayment = db.prepare(
    `INSERT INTO loan_payments
      (id, loan_id, member_id, amount, paid_on, principal_component, interest_component, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const borrowedSamples = [
    {
      name: "Home loan",
      person: "HDFC Bank",
      rupees: 3500000,
      rate: 8.5,
      months: 240,
      startOffset: -10,
      payments: 10,
      note: "Long-term housing EMI",
    },
    {
      name: "Car loan",
      person: "Axis Bank",
      rupees: 800000,
      rate: 9.2,
      months: 60,
      startOffset: -6,
      payments: 6,
      note: "EMI auto-pay on the 5th",
    },
    {
      name: "Gold loan",
      person: "City Finance",
      rupees: 150000,
      rate: 11,
      months: 12,
      startOffset: -2,
      payments: 2,
      note: "Short-term jewellery loan",
    },
  ];

  for (const sample of borrowedSamples) {
    const principal = toPaise(sample.rupees);
    const emi = calculateEmi(principal, sample.rate, sample.months);
    const loanId = randomUUID();
    const start = shiftMonth(current, sample.startOffset);
    insertLoan.run(
      loanId,
      householdId,
      "borrowed",
      sample.name,
      sample.person,
      principal,
      sample.rate,
      `${start}-05`,
      sample.months,
      emi,
      sample.note,
      primary,
      now,
    );

    let outstanding = principal;
    for (let i = 1; i <= sample.payments; i += 1) {
      const month = shiftMonth(start, i);
      const split = splitPayment(emi, outstanding, sample.rate);
      outstanding -= split.principal;
      insertPayment.run(
        randomUUID(),
        loanId,
        primary,
        emi,
        `${month}-05`,
        split.principal,
        split.interest,
        "Monthly EMI",
        now,
      );
    }
  }

  const lentPrincipal = toPaise(50000);
  const lentEmi = calculateEmi(lentPrincipal, 6, 12);
  const lentId = randomUUID();
  const lentStart = shiftMonth(current, -2);
  insertLoan.run(
    lentId,
    householdId,
    "lent",
    "Lent loan",
    "",
    lentPrincipal,
    6,
    `${lentStart}-10`,
    12,
    lentEmi,
    "Friendly loan, monthly return",
    primary,
    now,
  );

  let lentOutstanding = lentPrincipal;
  for (let i = 1; i <= 2; i += 1) {
    const month = shiftMonth(lentStart, i);
    const split = splitPayment(lentEmi, lentOutstanding, 6);
    lentOutstanding -= split.principal;
    insertPayment.run(
      randomUUID(),
      lentId,
      partner,
      lentEmi,
      `${month}-10`,
      split.principal,
      split.interest,
      "Monthly repayment received",
      now,
    );
  }

  const insertBudget = db.prepare(
    "INSERT OR REPLACE INTO budgets (id, household_id, category, month, amount, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const budgets: Array<[string, number]> = [
    ["Groceries", 18000],
    ["Fuel", 8000],
    ["School Fees", 10000],
    ["Dining Out", 6000],
    ["Utilities", 6000],
  ];
  for (const [category, rupees] of budgets) {
    insertBudget.run(randomUUID(), householdId, category, current, toPaise(rupees), now);
  }
  })();
}

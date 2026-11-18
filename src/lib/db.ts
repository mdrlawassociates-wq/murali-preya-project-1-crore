import "server-only";

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const globalForDb = globalThis as unknown as { __gharKhataDb?: Database.Database };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- People are labels inside a household (for example "Murali" and "Preya").
-- They are not logins: everyone signs in with the same household account.
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES people(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  occurred_on TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('borrowed', 'lent')),
  name TEXT NOT NULL,
  person TEXT NOT NULL DEFAULT '',
  principal INTEGER NOT NULL CHECK (principal > 0),
  annual_rate REAL NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  tenure_months INTEGER NOT NULL DEFAULT 12,
  emi INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS loan_payments (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES people(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  paid_on TEXT NOT NULL,
  principal_component INTEGER NOT NULL DEFAULT 0,
  interest_component INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  month TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at INTEGER NOT NULL,
  UNIQUE (household_id, category, month)
);

CREATE INDEX IF NOT EXISTS idx_people_household ON people(household_id);
CREATE INDEX IF NOT EXISTS idx_tx_household_date ON transactions(household_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_loans_household ON loans(household_id);
CREATE INDEX IF NOT EXISTS idx_payments_loan ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household_month ON budgets(household_id, month);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
`;

function referencesUsers(instance: Database.Database, table: string): boolean {
  const keys = instance.prepare(`PRAGMA foreign_key_list(${table})`).all() as Array<{
    table: string;
  }>;
  return keys.some((key) => key.table === "users");
}

/** Move recorded-person foreign keys from `users` to the new `people` table. */
function migrateMemberForeignKeys(instance: Database.Database): void {
  const needsTransactions = referencesUsers(instance, "transactions");
  const needsPayments = referencesUsers(instance, "loan_payments");
  if (!needsTransactions && !needsPayments) return;

  instance.pragma("foreign_keys = OFF");
  instance.transaction(() => {
    if (needsTransactions) {
      instance.exec(`
        CREATE TABLE transactions_new (
          id TEXT PRIMARY KEY,
          household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
          member_id TEXT NOT NULL REFERENCES people(id),
          type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
          category TEXT NOT NULL,
          amount INTEGER NOT NULL CHECK (amount > 0),
          occurred_on TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );
        INSERT INTO transactions_new
          (id, household_id, member_id, type, category, amount, occurred_on, note, created_at)
        SELECT t.id, t.household_id,
               COALESCE(
                 (SELECT p.id FROM people p WHERE p.id = t.member_id),
                 (SELECT p.id FROM people p WHERE p.household_id = t.household_id ORDER BY created_at LIMIT 1)
               ),
               t.type, t.category, t.amount, t.occurred_on, t.note, t.created_at
        FROM transactions t
        WHERE EXISTS (SELECT 1 FROM people p WHERE p.id = t.member_id)
           OR EXISTS (SELECT 1 FROM people p WHERE p.household_id = t.household_id);
        DROP TABLE transactions;
        ALTER TABLE transactions_new RENAME TO transactions;
        CREATE INDEX IF NOT EXISTS idx_tx_household_date ON transactions(household_id, occurred_on);
      `);
    }

    if (needsPayments) {
      instance.exec(`
        CREATE TABLE loan_payments_new (
          id TEXT PRIMARY KEY,
          loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
          member_id TEXT NOT NULL REFERENCES people(id),
          amount INTEGER NOT NULL CHECK (amount > 0),
          paid_on TEXT NOT NULL,
          principal_component INTEGER NOT NULL DEFAULT 0,
          interest_component INTEGER NOT NULL DEFAULT 0,
          note TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );
        INSERT INTO loan_payments_new
          (id, loan_id, member_id, amount, paid_on, principal_component, interest_component, note, created_at)
        SELECT p.id, p.loan_id,
               COALESCE(
                 (SELECT person.id FROM people person WHERE person.id = p.member_id),
                 (SELECT person.id FROM people person
                  JOIN loans l ON l.household_id = person.household_id
                  WHERE l.id = p.loan_id ORDER BY person.created_at LIMIT 1)
               ),
               p.amount, p.paid_on, p.principal_component, p.interest_component, p.note, p.created_at
        FROM loan_payments p
        WHERE EXISTS (SELECT 1 FROM people person WHERE person.id = p.member_id)
           OR EXISTS (SELECT 1 FROM loans l JOIN people person ON person.household_id = l.household_id WHERE l.id = p.loan_id);
        DROP TABLE loan_payments;
        ALTER TABLE loan_payments_new RENAME TO loan_payments;
        CREATE INDEX IF NOT EXISTS idx_payments_loan ON loan_payments(loan_id);
      `);
    }
  })();
  instance.pragma("foreign_keys = ON");
}

function openDatabase(): Database.Database {
  const configured = process.env.DATABASE_PATH || "./data/family-finance.db";
  const file = path.isAbsolute(configured)
    ? configured
    : path.join(/* turbopackIgnore: true */ process.cwd(), configured);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const instance = new Database(file);
  instance.pragma("busy_timeout = 5000");
  instance.pragma("foreign_keys = ON");
  instance.exec(SCHEMA);

  // Older databases stored the recorded person in `users`. Backfill any missing
  // people with the same ids so existing entries keep their labels.
  const users = instance
    .prepare("SELECT id, household_id, name, created_at FROM users")
    .all() as Array<{ id: string; household_id: string; name: string; created_at: number }>;
  const findPerson = instance.prepare("SELECT 1 FROM people WHERE id = ?");
  const insertPerson = instance.prepare(
    "INSERT INTO people (id, household_id, name, created_at) VALUES (?, ?, ?, ?)",
  );
  for (const user of users) {
    if (!findPerson.get(user.id)) {
      insertPerson.run(user.id, user.household_id, user.name, user.created_at);
    }
  }

  migrateMemberForeignKeys(instance);

  return instance;
}

export const db: Database.Database = globalForDb.__gharKhataDb ?? openDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__gharKhataDb = db;
}

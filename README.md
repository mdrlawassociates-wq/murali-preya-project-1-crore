# Murali Preya project 1 Crore

A shared household money app for you and your wife. Track income, everyday expenses, groceries,
fuel, school fees and loans, with clear monthly metrics. Amounts are in Indian Rupees (₹).

## What it does

- **One shared login** — you both use the same email and password. There are no invites and no
  second account. Entries are still tagged with a household *person*, so you can tell who each
  expense or payment belongs to.
- **Clean dashboard** — monthly cash flow, savings rate, six-month trend, category split, budget
  progress, recent activity and upcoming loan payments.
- **Loan closure planner** — ranks active home, car, gold, bike and personal loans using either
  *save most interest* (avalanche) or *quickest win* (snowball). It estimates extra payment,
  interest saved, months saved and a debt-free target month from reducing-balance interest.
- **Transactions** — add, edit, delete, search and filter entries by month, type, category and
  person. Export the filtered view to CSV.
- **Loans** — borrowed and lent loans with principal, interest, EMI calculation, progress,
  payment history and principal/interest split for every payment.
- **Groceries & everything else** — expense categories include Groceries, Fuel, School Fees,
  Rent, Utilities, Health, Dining Out, Transport, Shopping, Entertainment and more.
- **Budgets** — monthly category limits with remaining amount and over-budget warnings, plus a
  "copy last month" shortcut.
- **PWA** — installable on a phone; the app shell works offline, financial data never does.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. On a fresh database, create the **one** household account at
`/register`. Both of you then sign in at `/login` with those same credentials. You can add or
rename household people on **People**; these are labels for entries, not logins.

For this prepared workspace, the shared login is:

| | |
| --- | --- |
| Username | `admin` |
| Password | `admin` |

Change the password any time on **Settings → Change password**. If you deploy with a fresh
database, the first account you create becomes the shared login instead.

Optional: on **Settings → Sample data**, load four months of example entries, home/car/gold
loans and monthly budgets to explore the analytics before entering your own numbers. This only
works while the household is empty.

## Production / deployment

The app is self-hostable and needs persistent storage for its SQLite file.

```bash
npm run build
npm start
```

Or with Docker:

```bash
docker compose up -d --build
```

Set `DATABASE_PATH` to a location on a persistent volume. Back up that SQLite file to keep your
ledger safe. Put the app behind HTTPS in production — session cookies are marked `secure` when
`NODE_ENV=production`.

### Render

The repository includes `render.yaml`. In Render, choose **New → Blueprint**, connect this GitHub
repo, and Render will build the Dockerfile, mount a 1 GB persistent disk at `/app/data`, and give
you an HTTPS URL. The first visit starts with an empty database: register the one shared account,
then optionally load sample data from **Settings**. Your local SQLite file is not uploaded, so
re-enter any real entries or load the samples on the live instance.

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_PATH` | `./data/family-finance.db` | SQLite database location |
| `NODE_ENV` | development | `production` enables secure cookies |

## Data model

- `households` — the shared ledger
- `users` — the single shared login for the household
- `people` — labels such as "Murali" and "Preya"; entries are tagged with one of these
- `transactions` — income and expense entries, amounts stored as integer paise
- `loans` / `loan_payments` — borrowed or lent money, EMI and repayment history
- `budgets` — monthly per-category limits

All database queries are scoped to the signed-in household. Passwords are hashed with bcrypt and
sessions use random, httpOnly cookies.

## Scripts

```bash
npm run typecheck   # TypeScript check
npm run build       # Production build
npm start           # Run the built app
```

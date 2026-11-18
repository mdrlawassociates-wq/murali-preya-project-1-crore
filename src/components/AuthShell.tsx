import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <section className="auth-showcase">
        <Link
          href="/"
          className="brand brand--light"
          aria-label="Murali Preya project 1 Crore home"
        >
          <span className="brand__mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="brand__text">
            <strong>Murali Preya project 1 Crore</strong>
            <small>Household money, clearly</small>
          </span>
        </Link>

        <div className="auth-showcase__content">
          <p className="eyebrow eyebrow--light">One login. Two people. No guesswork.</p>
          <h1>
            Every rupee has
            <br />
            a place to land.
          </h1>
          <p className="auth-showcase__lead">
            Track income, expenses, school fees, fuel, groceries and loans in one shared space —
            with clear metrics and a plan to close your loans.
          </p>

          <div className="ledger-preview" aria-hidden="true">
            <div className="ledger-preview__head">
              <span>This month</span>
              <span>₹</span>
            </div>
            <div className="ledger-preview__row">
              <span>Income</span>
              <strong>2,03,500</strong>
            </div>
            <div className="ledger-preview__row">
              <span>Spent</span>
              <strong>86,420</strong>
            </div>
            <div className="ledger-preview__row ledger-preview__row--rule">
              <span>Left over</span>
              <strong>1,17,080</strong>
            </div>
            <div className="ledger-preview__note">Groceries · Fuel · School fees · Loans</div>
          </div>
        </div>

        <p className="auth-showcase__foot">Built for the everyday household, in ₹.</p>
      </section>

      <section className="auth-pane">{children}</section>
    </div>
  );
}

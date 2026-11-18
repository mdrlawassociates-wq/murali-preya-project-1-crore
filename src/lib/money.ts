const wholeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const preciseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Convert a rupee value from a form/API into integer paise. */
export function toPaise(rupees: number | string): number {
  const value = typeof rupees === "number" ? rupees : Number(rupees);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

export function formatMoney(paise: number, precise = false): string {
  return precise
    ? preciseFormatter.format(fromPaise(paise))
    : wholeFormatter.format(fromPaise(paise));
}

export function formatCompact(paise: number): string {
  const rupees = Math.abs(fromPaise(paise));
  const sign = paise < 0 ? "-" : "";
  if (rupees >= 1e7) return `${sign}₹${trim(rupees / 1e7)} Cr`;
  if (rupees >= 1e5) return `${sign}₹${trim(rupees / 1e5)} L`;
  if (rupees >= 1e3) return `${sign}₹${trim(rupees / 1e3)}k`;
  return `${sign}${wholeFormatter.format(rupees)}`;
}

function trim(value: number): string {
  return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2).replace(/\.0+$/, "");
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Monthly installment with reducing-balance interest. Rate is annual percent. */
export function calculateEmi(principalPaise: number, annualRate: number, months: number): number {
  if (principalPaise <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 1200;
  if (monthlyRate === 0) return Math.round(principalPaise / months);
  const factor = Math.pow(1 + monthlyRate, months);
  const emi = (principalPaise * monthlyRate * factor) / (factor - 1);
  return Math.round(emi);
}

/** Split a payment into interest and principal against the current outstanding. */
export function splitPayment(
  paymentPaise: number,
  outstandingPaise: number,
  annualRate: number,
): { principal: number; interest: number } {
  const interestDue = Math.round((outstandingPaise * annualRate) / 1200);
  const interest = Math.min(paymentPaise, interestDue, Math.max(outstandingPaise, 0));
  const principal = Math.max(0, Math.min(paymentPaise - interest, outstandingPaise));
  return { principal, interest };
}

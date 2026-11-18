export const EXPENSE_CATEGORIES = [
  "Groceries",
  "Fuel",
  "School Fees",
  "Rent",
  "Utilities",
  "Health",
  "Dining Out",
  "Transport",
  "Shopping",
  "Entertainment",
  "Loan Interest",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Salary",
  "Business",
  "Freelance",
  "Investment",
  "Gift",
  "Other",
] as const;

export const ALL_CATEGORIES = Array.from(
  new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]),
);

export const CATEGORY_COLORS: Record<string, string> = {
  Groceries: "#2f7d68",
  Fuel: "#d48b3a",
  "School Fees": "#5b6fb3",
  Rent: "#8c6a9e",
  Utilities: "#4a8fa6",
  Health: "#c4615c",
  "Dining Out": "#c99a4b",
  Transport: "#6f8b5c",
  Shopping: "#a06f8c",
  Entertainment: "#7c7fa8",
  "Loan Interest": "#9a7455",
  Other: "#84918a",
  Salary: "#2f7d68",
  Business: "#4a8fa6",
  Freelance: "#5b6fb3",
  Investment: "#8c6a9e",
  Gift: "#c99a4b",
};

export function colorForCategory(category: string): string {
  return CATEGORY_COLORS[category] ?? "#84918a";
}

export function isValidCategory(type: string, category: string): boolean {
  return type === "income"
    ? (INCOME_CATEGORIES as readonly string[]).includes(category)
    : (EXPENSE_CATEGORIES as readonly string[]).includes(category);
}

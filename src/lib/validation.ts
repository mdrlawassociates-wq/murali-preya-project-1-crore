import { z } from "zod";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./categories";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  partnerName: z.string().trim().max(60).optional().default("Partner"),
  // Stored in the legacy `email` column, but accepts a simple username like "admin".
  email: z.string().trim().toLowerCase().min(1, "Enter a username").max(100),
  password: z.string().min(4, "Use at least 4 characters").max(100),
  householdName: z.string().trim().min(2).max(60),
});

export const personSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(60),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your username").max(100),
  password: z.string().min(1, "Enter your password"),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Use at least 8 characters").max(100),
});

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  amountRupees: z.number().positive("Enter an amount above zero").max(100000000),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  note: z.string().trim().max(240).optional().default(""),
  memberId: z.string().optional(),
});

export const loanSchema = z.object({
  kind: z.enum(["borrowed", "lent"]),
  name: z.string().trim().min(2, "Give this loan a name").max(80),
  person: z.string().trim().max(80).optional().default(""),
  principalRupees: z.number().positive("Enter a principal above zero").max(100000000),
  annualRate: z.number().min(0).max(100).optional().default(0),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date"),
  tenureMonths: z.number().int().min(1).max(600).optional().default(12),
  emiRupees: z.number().min(0).max(100000000).optional(),
  notes: z.string().trim().max(500).optional().default(""),
});

export const paymentSchema = z.object({
  amountRupees: z.number().positive("Enter an amount above zero").max(100000000),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  note: z.string().trim().max(240).optional().default(""),
  memberId: z.string().optional(),
});

export const budgetSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Choose a month"),
  amountRupees: z.number().positive("Enter a limit above zero").max(100000000),
});

export const householdSchema = z.object({
  name: z.string().trim().min(2, "Enter a household name").max(60),
});

export function categoryAllowed(type: string, category: string): boolean {
  return type === "income"
    ? (INCOME_CATEGORIES as readonly string[]).includes(category)
    : (EXPENSE_CATEGORIES as readonly string[]).includes(category);
}

export function validationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the details you entered";
}

import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { AuthContext, AuthUser, Household, Member } from "./types";

export const SESSION_COOKIE = "gk_session";
const SESSION_DAYS = 30;

interface UserRow {
  id: string;
  household_id: string;
  name: string;
  email: string;
  created_at: number;
}

interface HouseholdRow {
  id: string;
  name: string;
  created_at: number;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function newInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  db.prepare(
    "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  ).run(token, userId, now + SESSION_DAYS * 86400000, now);
  return token;
}

export function deleteSession(token: string | undefined): void {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

function mapHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    currency: "INR",
  };
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT u.id AS user_id, u.name AS user_name, u.email AS user_email,
              h.id AS household_id, h.name AS household_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN households h ON h.id = u.household_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, Date.now()) as
    | {
        user_id: string;
        user_name: string;
        user_email: string;
        household_id: string;
        household_name: string;
      }
    | undefined;

  if (!row) return null;

  const household = mapHousehold({
    id: row.household_id,
    name: row.household_name,
    created_at: 0,
  });

  const user: AuthUser = {
    id: row.user_id,
    name: row.user_name,
    email: row.user_email,
    household,
  };

  const members = db
    .prepare("SELECT id, name FROM people WHERE household_id = ? ORDER BY created_at")
    .all(row.household_id) as Member[];

  return { user, household, members };
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  return auth;
}

export function createUserId(): string {
  return randomUUID();
}

export function createPerson(householdId: string, name: string, id = createUserId()): string {
  db.prepare(
    "INSERT INTO people (id, household_id, name, created_at) VALUES (?, ?, ?, ?)",
  ).run(id, householdId, name, Date.now());
  return id;
}

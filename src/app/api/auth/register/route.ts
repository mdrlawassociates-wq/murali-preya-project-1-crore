import { NextResponse } from "next/server";
import {
  createPerson,
  createSession,
  createUserId,
  hashPassword,
  newInviteCode,
  SESSION_COOKIE,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, conflict } from "@/lib/http";
import { registerSchema, validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));

  const { name, partnerName, email, password, householdName } = parsed.data;

  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return conflict("An account with this email already exists");
  }

  const householdId = createUserId();
  const userId = createUserId();
  const now = Date.now();

  db.transaction(() => {
    db.prepare(
      "INSERT INTO households (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)",
    ).run(householdId, householdName, newInviteCode(), now);
    db.prepare(
      "INSERT INTO users (id, household_id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(userId, householdId, name, email, hashPassword(password), now);
    // The primary person shares the user id so existing defaults keep working.
    createPerson(householdId, name, userId);
    createPerson(householdId, partnerName || "Partner");
  })();

  const token = createSession(userId);
  const response = NextResponse.json(
    { ok: true, user: { id: userId, name, email } },
    { status: 201 },
  );
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 86400,
  });
  return response;
}

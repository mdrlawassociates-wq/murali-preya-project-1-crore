import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest } from "@/lib/http";
import { loginSchema, validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));

  const row = db
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .get(parsed.data.email) as { id: string; password_hash: string } | undefined;

  if (!row || !verifyPassword(parsed.data.password, row.password_hash)) {
    return badRequest("That email and password don't match");
  }

  const token = createSession(row.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 86400,
  });
  return response;
}

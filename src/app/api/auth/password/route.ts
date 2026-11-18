import { getAuthContext, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, ok, unauthorized } from "@/lib/http";
import { passwordSchema, validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  const payload = await request.json().catch(() => null);
  const parsed = passwordSchema.safeParse(payload);
  if (!parsed.success) return badRequest(validationMessage(parsed.error));

  const row = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(auth.user.id) as { password_hash: string } | undefined;
  if (!row || !verifyPassword(parsed.data.currentPassword, row.password_hash)) {
    return badRequest("Your current password is incorrect");
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    hashPassword(parsed.data.newPassword),
    auth.user.id,
  );
  return ok();
}

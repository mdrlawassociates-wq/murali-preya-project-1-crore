import { NextResponse } from "next/server";

export function unauthorized() {
  return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError() {
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export function ok(data: unknown = { ok: true }) {
  return NextResponse.json(data);
}

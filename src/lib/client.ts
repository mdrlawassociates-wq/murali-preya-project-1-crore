export async function api<T = { ok: boolean }>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Something went wrong");
  }
  return data as T;
}

export function body(value: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(value) };
}

export function patchBody(value: unknown): RequestInit {
  return { method: "PATCH", body: JSON.stringify(value) };
}

export type ApiResult =
  | { ok: true }
  | {
      ok: false;
      code: string;
      message: string;
      /** Set by BALANCE_NOT_ZERO: positive means owed, negative means owes. */
      balanceCents?: number;
    };

/**
 * Sends one request to the API and reads the shared error shape
 * `{ error: { code, message } }`, so the screen can show the server's message.
 */
export async function sendRequest(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ApiResult> {
  try {
    const response = await fetch(url, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
    if (response.ok) return { ok: true };
    const data = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string; balanceCents?: number };
    } | null;
    return {
      ok: false,
      code: data?.error?.code ?? "ERROR",
      message: data?.error?.message ?? "Something went wrong. Try again.",
      balanceCents: data?.error?.balanceCents,
    };
  } catch {
    return {
      ok: false,
      code: "NETWORK",
      message: "Could not reach the server. Check your connection.",
    };
  }
}

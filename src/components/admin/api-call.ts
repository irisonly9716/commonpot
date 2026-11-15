/**
 * Sends one admin API request and returns an error message, or null on success.
 * Shows the server's own message when it sent one in the shared error shape.
 */
export async function sendAdminRequest(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<string | null> {
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
    if (response.ok) return null;
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return data?.error?.message ?? "Something went wrong. Try again.";
  } catch {
    return "Could not reach the server. Check your connection.";
  }
}

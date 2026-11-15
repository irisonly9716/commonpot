/**
 * The one error shape every route uses: `{ error: { code, message } }`.
 * `extra` adds fields next to them when the client needs the detail, such as
 * the balance that stopped a member from being removed.
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): Response {
  return Response.json({ error: { code, message, ...extra } }, { status });
}

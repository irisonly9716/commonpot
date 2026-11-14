const AUTH_PAGES = new Set(["/sign-in", "/sign-up"]);

/**
 * Returns `next` only when it is a path on this site, so a `?next=` value can't
 * send someone to another site. Anything else, and the sign-in and sign-up
 * pages themselves, gives the fallback.
 */
export function safeRedirectPath(
  next: string | readonly string[] | null | undefined,
  fallback = "/groups",
): string {
  // A repeated ?next=/a&next=/b reaches us as an array. Treat it as missing.
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  // "//host" is protocol-relative and "/\host" is read as "//host" by browsers.
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  const path = next.split(/[?#]/)[0];
  if (AUTH_PAGES.has(path)) return fallback;
  return next;
}

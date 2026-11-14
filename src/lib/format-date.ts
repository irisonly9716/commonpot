/** `2026-11-05T10:00:00Z` becomes "Nov 5, 2026" (in UTC, so it never shifts a day). */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

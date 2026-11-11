/** The shareable link for an invite, built from the site's own address. */
export function buildInviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/invite/${encodeURIComponent(token)}`;
}

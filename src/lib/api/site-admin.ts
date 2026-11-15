import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import type { Database } from "@/lib/db/database.types";

export type SiteAdminAccess =
  | { ok: true; supabase: SupabaseClient<Database>; user: User }
  | { ok: false; response: Response };

/**
 * Start of every /api/v1/admin route: authenticate (401), then require a site
 * admin (403). The flag is read from the user's own profile row, never from
 * anything the client sends.
 */
export async function requireSiteAdmin(
  request: Request,
): Promise<SiteAdminAccess> {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return {
      ok: false,
      response: apiError("UNAUTHORIZED", "Authentication required", 401),
    };
  }

  const { data, error } = await authenticated.supabase
    .from("profiles")
    .select("is_site_admin")
    .eq("id", authenticated.user.id)
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      response: apiError("DATABASE_ERROR", "Could not check your access", 500),
    };
  }
  if (!data?.is_site_admin) {
    return {
      ok: false,
      response: apiError("FORBIDDEN", "Site admins only", 403),
    };
  }
  return { ok: true, ...authenticated };
}

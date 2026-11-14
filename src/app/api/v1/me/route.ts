import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";

/** Returns the signed-in user. The first endpoint behind the 401 rule (US1). */
export async function GET(request: Request): Promise<Response> {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const { data, error } = await authenticated.supabase
    .from("profiles")
    .select("display_name")
    .eq("id", authenticated.user.id)
    .single();
  if (error) {
    return apiError("PROFILE_UNAVAILABLE", "Could not load your profile", 500);
  }

  return Response.json({
    id: authenticated.user.id,
    email: authenticated.user.email ?? null,
    displayName: data.display_name,
  });
}

import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import { readJsonBody } from "@/lib/api/json-body";
import { INVITE_UNAVAILABLE_MESSAGE } from "@/lib/groups/messages";
import { acceptInviteSchema } from "@/lib/validation/groups";

/**
 * Joins the signed-in user to the group the invite belongs to. Safe to call
 * twice: the database function does nothing if they are already a member. An
 * unknown, expired or revoked token all give the same 410, so the answer does
 * not reveal which tokens exist.
 */
export async function POST(request: Request): Promise<Response> {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const body = json.body;
  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "A token is required", 422);
  }

  const { data, error } = await authenticated.supabase.rpc("accept_invite", {
    p_token: parsed.data.token,
  });
  if (error) {
    // P0001 is the database function refusing: unknown, expired or revoked.
    if (error.code === "P0001") {
      return apiError("INVITE_UNAVAILABLE", INVITE_UNAVAILABLE_MESSAGE, 410);
    }
    return apiError("DATABASE_ERROR", "Could not join the group", 500);
  }
  return Response.json({ groupId: data });
}

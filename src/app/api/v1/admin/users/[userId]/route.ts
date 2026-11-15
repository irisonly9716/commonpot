import { z } from "zod";

import { apiError } from "@/lib/api/errors";
import { readJsonBody } from "@/lib/api/json-body";
import { requireSiteAdmin } from "@/lib/api/site-admin";
import { createAdminClient } from "@/lib/db/admin";
import { suspendUserSchema } from "@/lib/validation/admin";

/** About 100 years: Supabase Auth has no "forever", so the ban is very long. */
const BAN_FOREVER = "876000h";

type Context = { params: Promise<{ userId: string }> };

/**
 * Suspends or reactivates a user. Suspending sets `suspended_at` (the API and
 * the pages treat the account as signed out) and bans the user in Supabase Auth
 * (no new sign-ins or token refreshes). Uses the service-role key, server side.
 */
export async function PATCH(
  request: Request,
  context: Context,
): Promise<Response> {
  const access = await requireSiteAdmin(request);
  if (!access.ok) return access.response;

  const { userId } = await context.params;
  if (!z.uuid().safeParse(userId).success) {
    return apiError("VALIDATION_ERROR", "Invalid user id", 422);
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = suspendUserSchema.safeParse(json.body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Send { suspended: true or false }",
      422,
    );
  }

  if (parsed.data.suspended && userId === access.user.id) {
    return apiError("CONFLICT", "You cannot suspend your own account", 409);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    // Most likely SUPABASE_SERVICE_ROLE_KEY is not set on this deployment.
    return apiError(
      "SERVER_MISCONFIGURED",
      "Suspending users is not available on this server",
      500,
    );
  }
  const { data: existing, error: findError } = await admin
    .from("profiles")
    .select("suspended_at")
    .eq("id", userId)
    .maybeSingle();
  if (findError) {
    return apiError("DATABASE_ERROR", "Could not load the user", 500);
  }
  if (!existing) return apiError("NOT_FOUND", "User not found", 404);

  const suspendedAt = parsed.data.suspended ? new Date().toISOString() : null;
  const { error: updateError } = await admin
    .from("profiles")
    .update({ suspended_at: suspendedAt })
    .eq("id", userId);
  if (updateError) {
    return apiError("DATABASE_ERROR", "Could not update the user", 500);
  }

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: parsed.data.suspended ? BAN_FOREVER : "none",
  });
  if (banError) {
    // Keep the two in step: put the profile back the way it was.
    await admin
      .from("profiles")
      .update({ suspended_at: existing.suspended_at })
      .eq("id", userId);
    return apiError("AUTH_ERROR", "Could not update the user's sign-in", 500);
  }

  return Response.json({ id: userId, suspendedAt });
}

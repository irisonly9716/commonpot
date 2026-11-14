import { z } from "zod";

import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import { readJsonBody } from "@/lib/api/json-body";
import { alertUpdateSchema } from "@/lib/validation/alerts";

type AlertRouteContext = {
  params: Promise<{ alertId: string }>;
};

/** Marks one of my alerts as read or unread; only the read state can change. */
export async function PATCH(request: Request, context: AlertRouteContext) {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const { alertId } = await context.params;
  if (!z.uuid().safeParse(alertId).success) {
    return apiError("VALIDATION_ERROR", "Invalid alert id", 422);
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = alertUpdateSchema.safeParse(json.body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Request body is invalid",
      422,
    );
  }

  // RLS only lets me update my own alerts, so someone else's matches no row.
  const { data, error } = await authenticated.supabase
    .from("alerts")
    .update({ read_at: parsed.data.read ? new Date().toISOString() : null })
    .eq("id", alertId)
    .select("id, read_at")
    .maybeSingle();

  if (error) {
    return apiError("DATABASE_ERROR", "Could not update the alert", 500);
  }
  if (!data) return apiError("NOT_FOUND", "Alert not found", 404);

  return Response.json({ id: data.id, readAt: data.read_at });
}

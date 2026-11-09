import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import { loadMyAlerts } from "@/lib/data/alerts";
import { alertListQuerySchema } from "@/lib/validation/alerts";

export async function GET(request: Request) {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const query = alertListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) {
    return apiError("VALIDATION_ERROR", "unread must be true or false", 422);
  }

  try {
    return Response.json(
      await loadMyAlerts(authenticated.supabase, {
        unreadOnly: query.data.unread === "true",
      }),
    );
  } catch {
    return apiError("DATABASE_ERROR", "Could not load alerts", 500);
  }
}

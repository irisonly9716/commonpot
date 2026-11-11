import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import { listMyGroups } from "@/lib/data/groups";
import { createGroupSchema } from "@/lib/validation/groups";

/** The signed-in user's groups, newest first. */
export async function GET(request: Request): Promise<Response> {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }
  try {
    return Response.json(
      await listMyGroups(authenticated.supabase, authenticated.user.id),
    );
  } catch {
    return apiError("DATABASE_ERROR", "Could not load your groups", 500);
  }
}

/** Creates a group. A database trigger makes the creator its first admin. */
export async function POST(request: Request): Promise<Response> {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  ) {
    return apiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json",
      415,
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON", 422);
  }
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Request body is invalid",
      422,
    );
  }

  // Choose the id here and insert without asking for the row back. The row is
  // only readable once the creator's membership exists, and that is created by
  // a trigger during this same statement, so "insert ... returning" would be
  // refused by row level security. Read it in a second query instead.
  const id = crypto.randomUUID();
  const { error } = await authenticated.supabase.from("groups").insert({
    id,
    name: parsed.data.name,
    currency: parsed.data.currency,
    created_by: authenticated.user.id,
  });
  if (error) {
    return apiError("DATABASE_ERROR", "Could not create the group", 500);
  }

  const { data, error: readError } = await authenticated.supabase
    .from("groups")
    .select("id, name, currency")
    .eq("id", id)
    .single();
  if (readError) {
    return apiError("DATABASE_ERROR", "Could not load the new group", 500);
  }
  return Response.json({ ...data, role: "admin" }, { status: 201 });
}

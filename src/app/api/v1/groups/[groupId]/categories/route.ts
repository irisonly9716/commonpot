import { apiError } from "@/lib/api/errors";
import {
  requireAdmin,
  requireGroupMember,
  type GroupRouteContext,
} from "@/lib/api/group-access";
import { readJsonBody } from "@/lib/api/json-body";
import { createCategorySchema } from "@/lib/validation/members";

/** The group's categories, archived ones included. Every member can read them. */
export async function GET(
  request: Request,
  context: GroupRouteContext,
): Promise<Response> {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;

  const { data, error } = await access.supabase
    .from("categories")
    .select("id, name, is_archived")
    .eq("group_id", access.groupId)
    .order("name");
  if (error)
    return apiError("DATABASE_ERROR", "Could not load categories", 500);

  return Response.json(
    data.map((row) => ({
      id: row.id,
      name: row.name,
      isArchived: row.is_archived,
    })),
  );
}

/** Adds a category to the group. Admins only. */
export async function POST(
  request: Request,
  context: GroupRouteContext,
): Promise<Response> {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;
  const forbidden = requireAdmin(access);
  if (forbidden) return forbidden;

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = createCategorySchema.safeParse(json.body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Request body is invalid",
      422,
    );
  }

  const { data, error } = await access.supabase
    .from("categories")
    .insert({ group_id: access.groupId, name: parsed.data.name })
    .select("id, name, is_archived")
    .single();
  if (error) {
    // 23505 is the unique constraint on (group_id, name).
    if (error.code === "23505") {
      return apiError("CONFLICT", "That category already exists", 409);
    }
    return apiError("DATABASE_ERROR", "Could not add the category", 500);
  }

  return Response.json(
    { id: data.id, name: data.name, isArchived: data.is_archived },
    { status: 201 },
  );
}

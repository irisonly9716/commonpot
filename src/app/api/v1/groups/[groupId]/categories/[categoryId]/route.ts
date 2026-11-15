import { z } from "zod";

import { apiError } from "@/lib/api/errors";
import { requireAdmin, requireGroupMember } from "@/lib/api/group-access";
import { readJsonBody } from "@/lib/api/json-body";
import { updateCategorySchema } from "@/lib/validation/members";

type CategoryRouteContext = {
  params: Promise<{ groupId: string; categoryId: string }>;
};

/**
 * Renames or archives a category. Admins only. Archiving keeps the category on
 * the expenses that already use it; it just stops being offered for new ones.
 */
export async function PATCH(
  request: Request,
  context: CategoryRouteContext,
): Promise<Response> {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;
  const forbidden = requireAdmin(access);
  if (forbidden) return forbidden;

  const { categoryId } = await context.params;
  if (!z.uuid().safeParse(categoryId).success) {
    return apiError("VALIDATION_ERROR", "Invalid category id", 422);
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = updateCategorySchema.safeParse(json.body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Request body is invalid",
      422,
    );
  }

  const { data, error } = await access.supabase
    .from("categories")
    .update({
      ...(parsed.data.name === undefined ? {} : { name: parsed.data.name }),
      ...(parsed.data.isArchived === undefined
        ? {}
        : { is_archived: parsed.data.isArchived }),
    })
    .eq("id", categoryId)
    .eq("group_id", access.groupId)
    .select("id, name, is_archived")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return apiError("CONFLICT", "That category already exists", 409);
    }
    return apiError("DATABASE_ERROR", "Could not update the category", 500);
  }
  if (!data) return apiError("NOT_FOUND", "Category not found", 404);

  return Response.json({
    id: data.id,
    name: data.name,
    isArchived: data.is_archived,
  });
}

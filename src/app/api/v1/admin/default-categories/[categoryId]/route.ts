import { z } from "zod";

import { apiError } from "@/lib/api/errors";
import { readJsonBody } from "@/lib/api/json-body";
import { requireSiteAdmin } from "@/lib/api/site-admin";
import { updateDefaultCategorySchema } from "@/lib/validation/admin";

type Context = { params: Promise<{ categoryId: string }> };

/** Renames or archives a default category. */
export async function PATCH(
  request: Request,
  context: Context,
): Promise<Response> {
  const access = await requireSiteAdmin(request);
  if (!access.ok) return access.response;

  const { categoryId } = await context.params;
  if (!z.uuid().safeParse(categoryId).success) {
    return apiError("VALIDATION_ERROR", "Invalid category id", 422);
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = updateDefaultCategorySchema.safeParse(json.body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Request body is invalid",
      422,
    );
  }

  const { data, error } = await access.supabase
    .from("default_categories")
    .update({
      ...(parsed.data.name === undefined ? {} : { name: parsed.data.name }),
      ...(parsed.data.isArchived === undefined
        ? {}
        : { is_archived: parsed.data.isArchived }),
    })
    .eq("id", categoryId)
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

/** Removes a default category. Existing groups keep their own copy. */
export async function DELETE(
  request: Request,
  context: Context,
): Promise<Response> {
  const access = await requireSiteAdmin(request);
  if (!access.ok) return access.response;

  const { categoryId } = await context.params;
  if (!z.uuid().safeParse(categoryId).success) {
    return apiError("VALIDATION_ERROR", "Invalid category id", 422);
  }

  const { data, error } = await access.supabase
    .from("default_categories")
    .delete()
    .eq("id", categoryId)
    .select("id");
  if (error) {
    return apiError("DATABASE_ERROR", "Could not delete the category", 500);
  }
  if (data.length === 0) {
    return apiError("NOT_FOUND", "Category not found", 404);
  }
  return new Response(null, { status: 204 });
}

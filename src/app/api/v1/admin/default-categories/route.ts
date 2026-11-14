import { apiError } from "@/lib/api/errors";
import { readJsonBody } from "@/lib/api/json-body";
import { requireSiteAdmin } from "@/lib/api/site-admin";
import { createDefaultCategorySchema } from "@/lib/validation/admin";

/** The categories every new group starts with. */
export async function GET(request: Request): Promise<Response> {
  const access = await requireSiteAdmin(request);
  if (!access.ok) return access.response;

  const { data, error } = await access.supabase
    .from("default_categories")
    .select("id, name, is_archived")
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

/** Adds a default category. Groups that already exist keep their own list. */
export async function POST(request: Request): Promise<Response> {
  const access = await requireSiteAdmin(request);
  if (!access.ok) return access.response;

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = createDefaultCategorySchema.safeParse(json.body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Request body is invalid",
      422,
    );
  }

  const { data, error } = await access.supabase
    .from("default_categories")
    .insert({ name: parsed.data.name })
    .select("id, name, is_archived")
    .single();
  if (error) {
    // 23505 is the unique constraint on the name.
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

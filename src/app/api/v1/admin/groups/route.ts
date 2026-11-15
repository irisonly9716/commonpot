import { apiError } from "@/lib/api/errors";
import { requireSiteAdmin } from "@/lib/api/site-admin";

/** Every group with its creation date and member and expense counts. No amounts. */
export async function GET(request: Request): Promise<Response> {
  const access = await requireSiteAdmin(request);
  if (!access.ok) return access.response;

  const { data, error } = await access.supabase.rpc("admin_list_groups");
  if (error) return apiError("DATABASE_ERROR", "Could not load groups", 500);

  return Response.json(
    data.map((group) => ({
      id: group.id,
      name: group.name,
      createdAt: group.created_at,
      memberCount: Number(group.member_count),
      expenseCount: Number(group.expense_count),
    })),
  );
}

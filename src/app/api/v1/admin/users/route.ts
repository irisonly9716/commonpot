import { apiError } from "@/lib/api/errors";
import { requireSiteAdmin } from "@/lib/api/site-admin";

/** Every account with its sign-up date, status and counts. Never any amounts. */
export async function GET(request: Request): Promise<Response> {
  const access = await requireSiteAdmin(request);
  if (!access.ok) return access.response;

  const { data, error } = await access.supabase.rpc("admin_list_users");
  if (error) return apiError("DATABASE_ERROR", "Could not load users", 500);

  return Response.json(
    data.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
      suspendedAt: user.suspended_at,
      isSiteAdmin: user.is_site_admin,
      groupCount: Number(user.group_count),
      expenseCount: Number(user.expense_count),
    })),
  );
}

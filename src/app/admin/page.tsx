import { forbidden } from "next/navigation";

import { AdminGroupTable } from "@/components/admin/admin-group-table";
import { AdminUserTable } from "@/components/admin/admin-user-table";
import { DefaultCategoryEditor } from "@/components/admin/default-category-editor";
import { loadAdminDashboard } from "@/lib/data/admin";
import { createServerSupabaseClient } from "@/lib/db/server";

/** Site admin dashboard (US12). Everyone else gets a 403. */
export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) forbidden();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_site_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_site_admin) forbidden();

  const { users, groups, categories } = await loadAdminDashboard(supabase);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Site admin</h1>
      <p className="text-muted text-sm">
        Accounts and counts only. Amounts and expense details are never shown
        here.
      </p>

      <section aria-labelledby="users-heading" className="flex flex-col gap-3">
        <h2 id="users-heading" className="text-lg font-semibold">
          Users
        </h2>
        <AdminUserTable users={users} currentUserId={user.id} />
      </section>

      <section aria-labelledby="groups-heading" className="flex flex-col gap-3">
        <h2 id="groups-heading" className="text-lg font-semibold">
          Groups
        </h2>
        <AdminGroupTable groups={groups} />
      </section>

      <section
        aria-labelledby="categories-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="categories-heading" className="text-lg font-semibold">
          Default categories
        </h2>
        <p className="text-muted text-sm">
          New groups start with these. Existing groups keep their own list.
        </p>
        <DefaultCategoryEditor categories={categories} />
      </section>
    </main>
  );
}

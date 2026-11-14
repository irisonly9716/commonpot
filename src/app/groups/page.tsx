import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { listMyGroups } from "@/lib/data/groups";
import { createServerSupabaseClient } from "@/lib/db/server";

export default async function GroupsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=%2Fgroups");

  const groups = await listMyGroups(supabase, user.id);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Your groups</h1>

      {groups.length === 0 ? (
        <p>
          You are not in a group yet. Create one below, or open an invite link.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link href={`/groups/${group.id}`} className="underline">
                {group.name}
              </Link>{" "}
              <span className="text-sm text-gray-700">
                {group.currency} · {group.role === "admin" ? "Admin" : "Member"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <CreateGroupForm />

      <div>
        <SignOutButton />
      </div>
    </main>
  );
}

import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { InviteSection } from "@/components/groups/invite-section";
import { getGroupDetail, listActiveInvites } from "@/lib/data/groups";
import { createServerSupabaseClient } from "@/lib/db/server";
import { buildInviteUrl } from "@/lib/groups/invite-url";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  if (!z.uuid().safeParse(groupId).success) notFound();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(`/sign-in?next=${encodeURIComponent(`/groups/${groupId}`)}`);

  const group = await getGroupDetail(supabase, groupId, user.id);
  if (!group) notFound();

  const isAdmin = group.role === "admin";
  let invites: Array<{ id: string; url: string; expiresAt: string }> = [];
  if (isAdmin) {
    const requestHeaders = await headers();
    const host = requestHeaders.get("host") ?? "localhost:3000";
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
    invites = (await listActiveInvites(supabase, groupId)).map((invite) => ({
      id: invite.id,
      url: buildInviteUrl(`${protocol}://${host}`, invite.token),
      expiresAt: invite.expiresAt,
    }));
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Link href="/groups" className="text-sm underline">
          All groups
        </Link>
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <p className="text-sm text-gray-700">Currency: {group.currency}</p>
      </div>

      <nav aria-label="Group pages" className="flex gap-4">
        <Link href={`/groups/${group.id}/expenses`} className="underline">
          Expenses
        </Link>
        <Link href={`/groups/${group.id}/balances`} className="underline">
          Balances
        </Link>
      </nav>

      <section
        aria-labelledby="members-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="members-heading" className="text-lg font-semibold">
          Members
        </h2>
        <ul className="flex flex-col gap-2">
          {group.members.map((member) => (
            <li key={member.userId}>
              {member.displayName}
              {member.userId === user.id ? " (you)" : ""}{" "}
              <span className="text-sm text-gray-700">
                {member.role === "admin" ? "Admin" : "Member"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && <InviteSection groupId={group.id} initialInvites={invites} />}
    </main>
  );
}

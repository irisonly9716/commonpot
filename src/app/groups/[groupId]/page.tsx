import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { CategoryList } from "@/components/groups/category-list";
import { GroupNav } from "@/components/groups/group-nav";
import { InviteSection } from "@/components/groups/invite-section";
import { MemberList } from "@/components/groups/member-list";
import { getGroupDetail, listActiveInvites } from "@/lib/data/groups";
import { listGroupCategories } from "@/lib/data/members";
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
  const categories = isAdmin
    ? await listGroupCategories(supabase, groupId)
    : [];
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

      <GroupNav current="home" groupId={group.id} />

      <MemberList
        groupId={group.id}
        currentUserId={user.id}
        currentUserRole={group.role}
        currency={group.currency}
        members={group.members}
      />

      {isAdmin && <InviteSection groupId={group.id} initialInvites={invites} />}
      {isAdmin && <CategoryList groupId={group.id} categories={categories} />}
    </main>
  );
}

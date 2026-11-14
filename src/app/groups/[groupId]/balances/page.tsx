import { notFound } from "next/navigation";
import { z } from "zod";

import { BalancesView } from "@/components/balances/balances-view";
import { GroupLiveRefresh } from "@/components/realtime/group-live-refresh";
import {
  buildBalanceBreakdown,
  buildGroupBalances,
  loadGroupLedger,
} from "@/lib/data/balances";
import { createServerSupabaseClient } from "@/lib/db/server";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function GroupBalancesPage({ params }: PageProps) {
  const { groupId } = await params;
  if (!z.uuid().safeParse(groupId).success) notFound();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <p>Sign in to view this group&apos;s balances.</p>;
  }

  // RLS hides groups the user isn't in, so a missing ledger means 404.
  const ledger = await loadGroupLedger(supabase, groupId);
  if (!ledger) notFound();

  const { currency, balances, settlements } = buildGroupBalances(ledger);
  const breakdowns = Object.fromEntries(
    balances.map((balance) => [
      balance.userId,
      buildBalanceBreakdown(ledger, balance.userId)?.items ?? [],
    ]),
  );

  return (
    <>
      {/* Another member's expense or payment re-renders these numbers (US4). */}
      <GroupLiveRefresh groupId={groupId} userId={user.id} />
      <BalancesView
        balances={balances}
        breakdowns={breakdowns}
        currency={currency}
        currentUserId={user.id}
        groupId={groupId}
        members={ledger.members}
        settlements={settlements}
      />
    </>
  );
}

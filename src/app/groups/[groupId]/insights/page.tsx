import { notFound } from "next/navigation";
import { z } from "zod";

import { InsightsView } from "@/components/insights/insights-view";
import { loadGroupSpending } from "@/lib/data/spending";
import { createServerSupabaseClient } from "@/lib/db/server";
import { shiftMonth } from "@/lib/domain/spending";
import { insightsMonthSchema } from "@/lib/validation/insights";

type PageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ month?: string | string[] }>;
};

export default async function GroupInsightsPage({
  params,
  searchParams,
}: PageProps) {
  const { groupId } = await params;
  if (!z.uuid().safeParse(groupId).success) notFound();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <p>Sign in to view this group&apos;s insights.</p>;
  }

  // The server only knows its own (UTC) date, so it allows one month beyond it
  // for visitors whose local date is already in the next month. A bad value, or
  // anything further ahead, falls back to this month instead of an error page.
  const latestMonth = new Date().toISOString().slice(0, 7);
  const requested = insightsMonthSchema.safeParse((await searchParams).month);
  const monthFromUrl =
    requested.success && requested.data <= shiftMonth(latestMonth, 1);
  const month = monthFromUrl ? requested.data : latestMonth;

  // Not a member (or no such group) means 404, so nobody can tell it exists.
  const spending = await loadGroupSpending(supabase, groupId, month, user.id);
  if (!spending) notFound();

  return (
    <InsightsView
      groupName={spending.groupName}
      currency={spending.currency}
      currentUserId={user.id}
      month={month}
      latestMonth={latestMonth}
      monthFromUrl={monthFromUrl}
      members={spending.members}
      expenses={spending.expenses}
    />
  );
}

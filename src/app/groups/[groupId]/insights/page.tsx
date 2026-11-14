import { notFound } from "next/navigation";
import { z } from "zod";

import { InsightsView } from "@/components/insights/insights-view";
import { loadGroupSpending } from "@/lib/data/spending";
import { createServerSupabaseClient } from "@/lib/db/server";

type PageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ month?: string | string[] }>;
};

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

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

  // A bad or future month falls back to this month instead of an error page.
  const latestMonth = new Date().toISOString().slice(0, 7);
  const requested = monthSchema.safeParse((await searchParams).month);
  const month =
    requested.success && requested.data <= latestMonth
      ? requested.data
      : latestMonth;

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
      expenses={spending.expenses}
    />
  );
}

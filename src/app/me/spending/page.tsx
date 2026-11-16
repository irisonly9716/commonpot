import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MySpending } from "@/components/ledger/my-spending";
import { createServerSupabaseClient } from "@/lib/db/server";
import { monthSchema } from "@/lib/validation/personal";

export const metadata: Metadata = { title: "My spending" };

type PageProps = {
  searchParams: Promise<{ month?: string | string[] }>;
};

/** My spending (US10). The data comes from /api/v1, with the user's own token. */
export default async function MySpendingPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=%2Fme%2Fspending");

  const month = monthSchema.safeParse((await searchParams).month);
  return (
    <>
      <nav
        aria-label="Your pages"
        className="mx-auto w-full max-w-xl px-6 pt-6"
      >
        <Link className="text-label underline" href="/groups">
          Your groups
        </Link>
      </nav>
      <MySpending initialMonth={month.success ? month.data : undefined} />
    </>
  );
}

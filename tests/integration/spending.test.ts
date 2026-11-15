import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  GET as listExpenses,
  POST,
} from "../../src/app/api/v1/groups/[groupId]/expenses/route";
import { loadGroupSpending } from "@/lib/data/spending";
import type { Database } from "@/lib/db/database.types";
import {
  memberShares,
  monthTotal,
  spendingByCategory,
} from "@/lib/domain/spending";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const groupId = "11111111-1111-4111-8111-111111111111";
const adminId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";

async function signIn(email: string): Promise<string> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: anonKey, "content-type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    },
  );
  const body = (await response.json()) as { access_token: string };
  expect(response.ok).toBe(true);
  return body.access_token;
}

async function userIdOf(token: string): Promise<string> {
  const { data } = await clientFor(token).auth.getUser(token);
  return data.user!.id;
}

function clientFor(token: string) {
  return createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Admin pays 90.00 on 2025-03-10 and splits it 30.00 / 60.00 with member. */
async function addMarchExpense(adminToken: string, categoryId: string | null) {
  const response = await POST(
    new Request(`http://localhost/api/v1/groups/${groupId}/expenses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        amountCents: 9000,
        description: "Insights test expense",
        categoryId,
        expenseDate: "2025-03-10",
        paidBy: adminId,
        shares: [
          { userId: adminId, amountCents: 3000 },
          { userId: memberId, amountCents: 6000 },
        ],
      }),
    }),
    { params: Promise.resolve({ groupId }) },
  );
  expect(response.status).toBe(201);
}

describe("US8 spending for the insights page", () => {
  it("matches what the expense list API returns for the same month", async () => {
    const token = await signIn("admin@example.com");
    const month = "2026-11";

    // The list a member sees: the real GET /expenses route, summed by month.
    const listResponse = await listExpenses(
      new Request(`http://localhost/api/v1/groups/${groupId}/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      { params: Promise.resolve({ groupId }) },
    );
    expect(listResponse.status).toBe(200);
    const listed = (await listResponse.json()) as Array<{
      expenseDate: string;
      amountCents: number;
      shares: Array<{ userId: string; amountCents: number }>;
    }>;
    const inMonth = listed.filter((e) => e.expenseDate.startsWith(month));
    const listTotal = inMonth.reduce((sum, e) => sum + e.amountCents, 0);
    const myShare = inMonth
      .flatMap((e) => e.shares)
      .filter((share) => share.userId === adminId)
      .reduce((sum, share) => sum + share.amountCents, 0);
    expect(listTotal).toBeGreaterThan(0);

    const spending = await loadGroupSpending(
      clientFor(token),
      groupId,
      month,
      adminId,
    );
    expect(spending).not.toBeNull();
    const group = { kind: "group" } as const;
    expect(monthTotal(spending!.expenses, group, month)).toBe(listTotal);
    expect(
      monthTotal(spending!.expenses, { kind: "me", userId: adminId }, month),
    ).toBe(myShare);
    const rows = spendingByCategory(spending!.expenses, group, month);
    expect(rows.reduce((sum, row) => sum + row.amountCents, 0)).toBe(listTotal);
  });

  it("does not show another household's spending to a member of a different group", async () => {
    // member@ belongs to the seed group, not to "Other household".
    const otherGroup = "99999999-9999-4999-8999-999999999999";
    const token = await signIn("member@example.com");
    const memberId = await userIdOf(token);
    expect(
      await loadGroupSpending(
        clientFor(token),
        otherGroup,
        "2026-11",
        memberId,
      ),
    ).toBeNull();
    // Even if the caller claims to be a member of it, RLS hides the rows.
    const claimed = await loadGroupSpending(
      clientFor(token),
      otherGroup,
      "2026-11",
      "55555555-5555-4555-8555-555555555555",
    );
    expect(claimed).toBeNull();
  });

  it("counts my share, not what I paid, for each person", async () => {
    // The database keeps rows between runs, so compare before and after.
    const month = "2025-03";
    const adminToken = await signIn("admin@example.com");
    const memberToken = await signIn("member@example.com");
    const load = async (token: string, userId: string) =>
      (await loadGroupSpending(clientFor(token), groupId, month, userId))!
        .expenses;
    const totals = (
      expenses: Awaited<ReturnType<typeof load>>,
      userId: string,
    ) => ({
      group: monthTotal(expenses, { kind: "group" }, month),
      me: monthTotal(expenses, { kind: "me", userId }, month),
      groceries:
        spendingByCategory(expenses, { kind: "group" }, month).find(
          (row) => row.category === "Groceries",
        )?.amountCents ?? 0,
    });

    const adminBefore = totals(await load(adminToken, adminId), adminId);
    const memberBefore = totals(await load(memberToken, memberId), memberId);

    const { data: category } = await clientFor(adminToken)
      .from("categories")
      .select("id")
      .eq("group_id", groupId)
      .eq("name", "Groceries")
      .single();
    await addMarchExpense(adminToken, category!.id);

    const adminAfter = totals(await load(adminToken, adminId), adminId);
    const memberAfter = totals(await load(memberToken, memberId), memberId);

    // Admin paid 90.00 but their share is 30.00; member's share is 60.00.
    expect(adminAfter.group - adminBefore.group).toBe(9000);
    expect(adminAfter.groceries - adminBefore.groceries).toBe(9000);
    expect(adminAfter.me - adminBefore.me).toBe(3000);
    expect(memberAfter.me - memberBefore.me).toBe(6000);
    expect(memberAfter.group - memberBefore.group).toBe(9000);
  });

  it("returns nothing for someone outside the group", async () => {
    const token = await signIn("site-admin@example.com");
    expect(
      await loadGroupSpending(
        clientFor(token),
        groupId,
        "2026-11",
        await userIdOf(token),
      ),
    ).toBeNull();
  });

  it("lets every member see each member's share, adding up to the group total", async () => {
    const month = "2026-11";
    const memberToken = await signIn("member@example.com");
    const spending = await loadGroupSpending(
      clientFor(memberToken),
      groupId,
      month,
      memberId,
    );
    expect(spending).not.toBeNull();
    const names = Object.fromEntries(
      spending!.members.map((m) => [m.id, m.displayName]),
    );
    // A plain member sees the whole member list, not only themselves.
    expect(Object.keys(names)).toEqual(
      expect.arrayContaining([adminId, memberId]),
    );
    expect(names[adminId]).toBeTruthy();

    const rows = memberShares(
      spending!.expenses,
      month,
      spending!.members.map((m) => m.id),
    );
    const total = monthTotal(spending!.expenses, { kind: "group" }, month);
    expect(total).toBeGreaterThan(0);
    expect(rows.reduce((sum, row) => sum + row.amountCents, 0)).toBe(total);
    expect(rows.find((row) => row.userId === adminId)!.amountCents).toBe(
      monthTotal(spending!.expenses, { kind: "me", userId: adminId }, month),
    );
  });
});

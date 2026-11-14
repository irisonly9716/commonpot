import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { POST } from "../../src/app/api/v1/groups/[groupId]/expenses/route";
import { loadGroupSpending } from "@/lib/data/spending";
import type { Database } from "@/lib/db/database.types";
import { monthTotal, spendingByCategory } from "@/lib/domain/spending";

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
  it("matches the expense list for the same month", async () => {
    const token = await signIn("admin@example.com");
    const supabase = clientFor(token);
    const month = "2026-11";

    const spending = await loadGroupSpending(supabase, groupId, month);
    expect(spending).not.toBeNull();

    const { data: listed } = await supabase
      .from("expenses")
      .select("amount_cents")
      .eq("group_id", groupId)
      .gte("expense_date", `${month}-01`)
      .lt("expense_date", "2026-12-01");
    const listTotal = (listed ?? []).reduce(
      (sum, row) => sum + row.amount_cents,
      0,
    );

    const total = monthTotal(spending!.expenses, { kind: "group" }, month);
    expect(listTotal).toBeGreaterThan(0);
    expect(total).toBe(listTotal);
    const rows = spendingByCategory(
      spending!.expenses,
      { kind: "group" },
      month,
    );
    expect(rows.reduce((sum, row) => sum + row.amountCents, 0)).toBe(listTotal);
  });

  it("counts my share, not what I paid, for each person", async () => {
    const adminToken = await signIn("admin@example.com");
    const { data: category } = await clientFor(adminToken)
      .from("categories")
      .select("id, name")
      .eq("group_id", groupId)
      .eq("name", "Groceries")
      .single();
    await addMarchExpense(adminToken, category!.id);

    const forAdmin = await loadGroupSpending(
      clientFor(adminToken),
      groupId,
      "2025-03",
    );
    const memberToken = await signIn("member@example.com");
    const forMember = await loadGroupSpending(
      clientFor(memberToken),
      groupId,
      "2025-03",
    );

    const month = "2025-03";
    expect(monthTotal(forAdmin!.expenses, { kind: "group" }, month)).toBe(9000);
    expect(
      monthTotal(forAdmin!.expenses, { kind: "me", userId: adminId }, month),
    ).toBe(3000);
    expect(
      monthTotal(forMember!.expenses, { kind: "me", userId: memberId }, month),
    ).toBe(6000);
    expect(
      spendingByCategory(forAdmin!.expenses, { kind: "group" }, month),
    ).toEqual([{ category: "Groceries", amountCents: 9000, percent: 100 }]);
  });

  it("returns nothing for someone outside the group", async () => {
    const token = await signIn("site-admin@example.com");
    expect(
      await loadGroupSpending(clientFor(token), groupId, "2026-11"),
    ).toBeNull();
  });
});

import { beforeAll, describe, expect, it } from "vitest";

import { POST as createExpense } from "@/app/api/v1/groups/[groupId]/expenses/route";
import { POST as createInvite } from "@/app/api/v1/groups/[groupId]/invites/route";
import {
  DELETE as removeMember,
  PATCH as updateRole,
} from "@/app/api/v1/groups/[groupId]/members/[userId]/route";
import {
  GET as listCategories,
  POST as createCategory,
} from "@/app/api/v1/groups/[groupId]/categories/route";
import { PATCH as updateCategory } from "@/app/api/v1/groups/[groupId]/categories/[categoryId]/route";
import { GET as getGroup } from "@/app/api/v1/groups/[groupId]/route";
import { POST as createGroup } from "@/app/api/v1/groups/route";
import { POST as acceptInvite } from "@/app/api/v1/invites/accept/route";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const password = "password123";

type Session = { token: string; userId: string };
type Json = Record<string, unknown>;

async function signUp(): Promise<Session> {
  const email = `members-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      data: { display_name: email.slice(0, 12) },
    }),
  });
  const text = await response.text();
  expect(response.ok, text).toBe(true);
  const body = JSON.parse(text) as {
    access_token: string;
    user: { id: string };
  };
  return { token: body.access_token, userId: body.user.id };
}

function call(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = (groupId: string) => ({ params: Promise.resolve({ groupId }) });
const memberCtx = (groupId: string, userId: string) => ({
  params: Promise.resolve({ groupId, userId }),
});
const categoryCtx = (groupId: string, categoryId: string) => ({
  params: Promise.resolve({ groupId, categoryId }),
});

/** A new group: `admin` created it, and `members` joined through an invite. */
async function newGroup(admin: Session, members: Session[]): Promise<string> {
  const created = await createGroup(
    call("POST", "/api/v1/groups", admin.token, {
      name: `Members test ${Date.now()}`,
      currency: "USD",
    }),
  );
  expect(created.status).toBe(201);
  const groupId = ((await created.json()) as { id: string }).id;
  for (const member of members) {
    const invite = await createInvite(
      call("POST", `/api/v1/groups/${groupId}/invites`, admin.token),
      ctx(groupId),
    );
    const { token } = (await invite.json()) as { token: string };
    const accepted = await acceptInvite(
      call("POST", "/api/v1/invites/accept", member.token, { token }),
    );
    expect(accepted.status).toBe(200);
  }
  return groupId;
}

/** `payer` pays 10.00 and splits it 5.00 / 5.00 with `other`. */
async function sharedExpense(
  groupId: string,
  payer: Session,
  other: Session,
): Promise<void> {
  const response = await createExpense(
    call("POST", `/api/v1/groups/${groupId}/expenses`, payer.token, {
      amountCents: 1000,
      description: "Shared dinner",
      categoryId: null,
      expenseDate: "2026-11-10",
      paidBy: payer.userId,
      shares: [
        { userId: payer.userId, amountCents: 500 },
        { userId: other.userId, amountCents: 500 },
      ],
    }),
    ctx(groupId),
  );
  expect(response.status).toBe(201);
}

async function groupStatus(groupId: string, who: Session): Promise<number> {
  const response = await getGroup(
    call("GET", `/api/v1/groups/${groupId}`, who.token),
    ctx(groupId),
  );
  return response.status;
}

async function roleOf(
  groupId: string,
  viewer: Session,
  userId: string,
): Promise<string | undefined> {
  const response = await getGroup(
    call("GET", `/api/v1/groups/${groupId}`, viewer.token),
    ctx(groupId),
  );
  const group = (await response.json()) as {
    members: Array<{ userId: string; role: string }>;
  };
  return group.members.find((m) => m.userId === userId)?.role;
}

let alice: Session;
let bob: Session;
let carol: Session;
let dave: Session;

beforeAll(async () => {
  [alice, bob, carol, dave] = await Promise.all([
    signUp(),
    signUp(),
    signUp(),
    signUp(),
  ]);
});

describe("US11 manage the group: who is allowed", () => {
  it("answers 401 without a token", async () => {
    const groupId = await newGroup(alice, [bob]);
    const responses = [
      await updateRole(
        call("PATCH", "/x", undefined, { role: "admin" }),
        memberCtx(groupId, bob.userId),
      ),
      await removeMember(call("DELETE", "/x"), memberCtx(groupId, bob.userId)),
      await listCategories(call("GET", "/x"), ctx(groupId)),
      await createCategory(
        call("POST", "/x", undefined, { name: "A" }),
        ctx(groupId),
      ),
      await updateCategory(
        call("PATCH", "/x", undefined, { name: "A" }),
        categoryCtx(groupId, bob.userId),
      ),
    ];
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: { code: "UNAUTHORIZED", message: expect.any(String) },
      });
    }
  });

  it("answers 404 for someone outside the group, on every route", async () => {
    const groupId = await newGroup(alice, [bob]);
    const responses = [
      await updateRole(
        call("PATCH", "/x", dave.token, { role: "admin" }),
        memberCtx(groupId, bob.userId),
      ),
      await removeMember(
        call("DELETE", "/x", dave.token),
        memberCtx(groupId, bob.userId),
      ),
      await listCategories(call("GET", "/x", dave.token), ctx(groupId)),
      await createCategory(
        call("POST", "/x", dave.token, { name: "A" }),
        ctx(groupId),
      ),
    ];
    for (const response of responses) expect(response.status).toBe(404);
  });

  it("answers 403 when a plain member tries admin actions, but lets them read categories", async () => {
    const groupId = await newGroup(alice, [bob, carol]);
    const categories = await listCategories(
      call("GET", "/x", bob.token),
      ctx(groupId),
    );
    expect(categories.status).toBe(200);
    const list = (await categories.json()) as Array<{ id: string }>;
    expect(list.length).toBeGreaterThan(0);

    const forbidden = [
      await updateRole(
        call("PATCH", "/x", bob.token, { role: "admin" }),
        memberCtx(groupId, carol.userId),
      ),
      await removeMember(
        call("DELETE", "/x", bob.token),
        memberCtx(groupId, carol.userId),
      ),
      await createCategory(
        call("POST", "/x", bob.token, { name: "Nope" }),
        ctx(groupId),
      ),
      await updateCategory(
        call("PATCH", "/x", bob.token, { name: "Nope" }),
        categoryCtx(groupId, list[0].id),
      ),
    ];
    for (const response of forbidden) {
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: { code: "FORBIDDEN", message: expect.any(String) },
      });
    }
    expect(await roleOf(groupId, alice, carol.userId)).toBe("member");
  });
});

describe("US11 roles", () => {
  it("promotes a member to admin and can set them back to member", async () => {
    const groupId = await newGroup(alice, [bob]);
    const promoted = await updateRole(
      call("PATCH", "/x", alice.token, { role: "admin" }),
      memberCtx(groupId, bob.userId),
    );
    expect(promoted.status).toBe(200);
    expect(await promoted.json()).toEqual({
      userId: bob.userId,
      role: "admin",
    });
    expect(await roleOf(groupId, alice, bob.userId)).toBe("admin");

    const demoted = await updateRole(
      call("PATCH", "/x", alice.token, { role: "member" }),
      memberCtx(groupId, bob.userId),
    );
    expect(demoted.status).toBe(200);
    expect(await roleOf(groupId, alice, bob.userId)).toBe("member");
  });

  it("validates the role, the ids and that the person is a member", async () => {
    const groupId = await newGroup(alice, [bob]);
    const badRole = await updateRole(
      call("PATCH", "/x", alice.token, { role: "owner" }),
      memberCtx(groupId, bob.userId),
    );
    expect(badRole.status).toBe(422);
    const badId = await updateRole(
      call("PATCH", "/x", alice.token, { role: "admin" }),
      memberCtx(groupId, "not-a-uuid"),
    );
    expect(badId.status).toBe(422);
    const notMember = await updateRole(
      call("PATCH", "/x", alice.token, { role: "admin" }),
      memberCtx(groupId, dave.userId),
    );
    expect(notMember.status).toBe(404);
  });

  it("does not let an admin change their own role", async () => {
    const groupId = await newGroup(alice, [bob]);
    const response = await updateRole(
      call("PATCH", "/x", alice.token, { role: "member" }),
      memberCtx(groupId, alice.userId),
    );
    expect(response.status).toBe(409);
    expect(await roleOf(groupId, alice, alice.userId)).toBe("admin");
  });
});

describe("US11 removing members", () => {
  it("removes a member whose balance is zero, who then loses access", async () => {
    const groupId = await newGroup(alice, [bob, carol]);
    expect(await groupStatus(groupId, carol)).toBe(200);
    const response = await removeMember(
      call("DELETE", "/x", alice.token),
      memberCtx(groupId, carol.userId),
    );
    expect(response.status).toBe(204);
    expect(await groupStatus(groupId, carol)).toBe(404);
    expect(await roleOf(groupId, alice, carol.userId)).toBeUndefined();
  });

  it("shows the balance and needs confirmation when it is not zero", async () => {
    const groupId = await newGroup(alice, [bob]);
    await sharedExpense(groupId, alice, bob);

    const first = await removeMember(
      call("DELETE", "/x", alice.token),
      memberCtx(groupId, bob.userId),
    );
    expect(first.status).toBe(409);
    expect(await first.json()).toEqual({
      error: {
        code: "BALANCE_NOT_ZERO",
        message: expect.any(String),
        // Bob owes 5.00, so his balance is negative.
        balanceCents: -500,
      },
    });
    expect(await groupStatus(groupId, bob)).toBe(200);

    const confirmed = await removeMember(
      call("DELETE", "/x?confirm=true", alice.token),
      memberCtx(groupId, bob.userId),
    );
    expect(confirmed.status).toBe(204);
    expect(await groupStatus(groupId, bob)).toBe(404);
  });

  it("reports a positive balance for someone who is owed", async () => {
    const groupId = await newGroup(alice, [bob]);
    await sharedExpense(groupId, bob, alice);
    const response = await removeMember(
      call("DELETE", "/x", alice.token),
      memberCtx(groupId, bob.userId),
    );
    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: Json };
    expect(body.error.balanceCents).toBe(500);
  });
});

describe("US11 leaving", () => {
  it("lets a member with a zero balance leave", async () => {
    const groupId = await newGroup(alice, [bob]);
    const response = await removeMember(
      call("DELETE", "/x", bob.token),
      memberCtx(groupId, bob.userId),
    );
    expect(response.status).toBe(204);
    expect(await groupStatus(groupId, bob)).toBe(404);
    expect(await groupStatus(groupId, alice)).toBe(200);
  });

  it("does not let someone leave with a balance, even with confirm=true", async () => {
    const groupId = await newGroup(alice, [bob]);
    await sharedExpense(groupId, alice, bob);
    for (const path of ["/x", "/x?confirm=true"]) {
      const response = await removeMember(
        call("DELETE", path, bob.token),
        memberCtx(groupId, bob.userId),
      );
      expect(response.status).toBe(409);
      const body = (await response.json()) as { error: Json };
      expect(body.error.code).toBe("BALANCE_NOT_ZERO");
      expect(body.error.balanceCents).toBe(-500);
    }
    expect(await groupStatus(groupId, bob)).toBe(200);
  });

  it("does not let the last admin leave, until someone else is promoted", async () => {
    const groupId = await newGroup(alice, [bob]);
    const blocked = await removeMember(
      call("DELETE", "/x", alice.token),
      memberCtx(groupId, alice.userId),
    );
    expect(blocked.status).toBe(409);
    expect(await blocked.json()).toEqual({
      error: { code: "LAST_ADMIN", message: expect.any(String) },
    });
    expect(await groupStatus(groupId, alice)).toBe(200);

    await updateRole(
      call("PATCH", "/x", alice.token, { role: "admin" }),
      memberCtx(groupId, bob.userId),
    );
    const allowed = await removeMember(
      call("DELETE", "/x", alice.token),
      memberCtx(groupId, alice.userId),
    );
    expect(allowed.status).toBe(204);
    expect(await groupStatus(groupId, alice)).toBe(404);
    expect(await roleOf(groupId, bob, bob.userId)).toBe("admin");
  });

  it("does not let an admin remove another member who is not in the group", async () => {
    const groupId = await newGroup(alice, [bob]);
    const response = await removeMember(
      call("DELETE", "/x", alice.token),
      memberCtx(groupId, dave.userId),
    );
    expect(response.status).toBe(404);
  });
});

describe("US11 categories", () => {
  it("lists the group's categories, adds one and refuses a duplicate", async () => {
    const groupId = await newGroup(alice, []);
    const before = (await (
      await listCategories(call("GET", "/x", alice.token), ctx(groupId))
    ).json()) as Array<{ id: string; name: string; isArchived: boolean }>;
    expect(before.length).toBeGreaterThan(0);
    expect(before[0]).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      isArchived: expect.any(Boolean),
    });

    const created = await createCategory(
      call("POST", "/x", alice.token, { name: "  Pets  " }),
      ctx(groupId),
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({
      id: expect.any(String),
      name: "Pets",
      isArchived: false,
    });

    const duplicate = await createCategory(
      call("POST", "/x", alice.token, { name: "Pets" }),
      ctx(groupId),
    );
    expect(duplicate.status).toBe(409);

    const empty = await createCategory(
      call("POST", "/x", alice.token, { name: "   " }),
      ctx(groupId),
    );
    expect(empty.status).toBe(422);
  });

  it("renames and archives a category, and keeps it out of other groups", async () => {
    const groupId = await newGroup(alice, []);
    const otherGroupId = await newGroup(bob, []);
    const created = (await (
      await createCategory(
        call("POST", "/x", alice.token, { name: "Hobbies" }),
        ctx(groupId),
      )
    ).json()) as { id: string };

    const renamed = await updateCategory(
      call("PATCH", "/x", alice.token, { name: "Fun", isArchived: true }),
      categoryCtx(groupId, created.id),
    );
    expect(renamed.status).toBe(200);
    expect(await renamed.json()).toEqual({
      id: created.id,
      name: "Fun",
      isArchived: true,
    });

    const empty = await updateCategory(
      call("PATCH", "/x", alice.token, {}),
      categoryCtx(groupId, created.id),
    );
    expect(empty.status).toBe(422);

    // Bob administers a different group. He cannot touch Alice's category,
    // even by naming his own group in the path.
    const crossGroup = await updateCategory(
      call("PATCH", "/x", bob.token, { name: "Hacked" }),
      categoryCtx(otherGroupId, created.id),
    );
    expect(crossGroup.status).toBe(404);
    const unknown = await updateCategory(
      call("PATCH", "/x", alice.token, { name: "Nope" }),
      categoryCtx(groupId, "00000000-0000-4000-8000-000000000000"),
    );
    expect(unknown.status).toBe(404);
  });
});

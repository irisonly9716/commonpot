import { describe, expect, it } from "vitest";

import { POST as acceptInvite } from "@/app/api/v1/invites/accept/route";
import { DELETE as revokeInvite } from "@/app/api/v1/groups/[groupId]/invites/[inviteId]/route";
import {
  GET as listInvites,
  POST as createInvite,
} from "@/app/api/v1/groups/[groupId]/invites/route";
import { GET as getGroup } from "@/app/api/v1/groups/[groupId]/route";
import {
  GET as listGroups,
  POST as createGroup,
} from "@/app/api/v1/groups/route";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const seedGroupId = "11111111-1111-4111-8111-111111111111";
const DAY_MS = 24 * 60 * 60 * 1000;

type Session = { token: string; userId: string };

async function signIn(email: string): Promise<Session> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: anonKey, "content-type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    },
  );
  const text = await response.text();
  expect(response.ok, text).toBe(true);
  const body = JSON.parse(text) as {
    access_token: string;
    user: { id: string };
  };
  return { token: body.access_token, userId: body.user.id };
}

function request(
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

const groupContext = (groupId: string) => ({
  params: Promise.resolve({ groupId }),
});
const inviteContext = (groupId: string, inviteId: string) => ({
  params: Promise.resolve({ groupId, inviteId }),
});

async function makeGroup(
  session: Session,
  name = "Test flat",
  currency = "EUR",
) {
  const response = await createGroup(
    request("POST", "/api/v1/groups", session.token, { name, currency }),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as {
    id: string;
    name: string;
    currency: string;
  };
}

async function makeInvite(session: Session, groupId: string) {
  const response = await createInvite(
    request("POST", `/api/v1/groups/${groupId}/invites`, session.token, {}),
    groupContext(groupId),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as {
    id: string;
    token: string;
    url: string;
    expiresAt: string;
  };
}

async function accept(session: Session, token: string) {
  return acceptInvite(
    request("POST", "/api/v1/invites/accept", session.token, { token }),
  );
}

async function members(session: Session, groupId: string) {
  const response = await getGroup(
    request("GET", `/api/v1/groups/${groupId}`, session.token),
    groupContext(groupId),
  );
  expect(response.status).toBe(200);
  const body = (await response.json()) as {
    members: Array<{ userId: string; displayName: string; role: string }>;
  };
  return body.members;
}

describe("US2 start a shared account: creating a group", () => {
  it("makes the creator the admin and returns the group", async () => {
    const jay = await signIn("member@example.com");
    const group = await makeGroup(jay, "  Maple St.  ", "EUR");
    expect(group).toMatchObject({ name: "Maple St.", currency: "EUR" });

    const list = (await (
      await listGroups(request("GET", "/api/v1/groups", jay.token))
    ).json()) as Array<{ id: string; role: string }>;
    expect(list.find((g) => g.id === group.id)?.role).toBe("admin");

    const people = await members(jay, group.id);
    expect(people).toEqual([
      expect.objectContaining({ userId: jay.userId, role: "admin" }),
    ]);
  });

  it("rejects a blank name, a long name and an unsupported currency with 422", async () => {
    const jay = await signIn("member@example.com");
    for (const body of [
      { name: "   ", currency: "USD" },
      { name: "x".repeat(61), currency: "USD" },
      { name: "Home", currency: "XYZ" },
      { name: "Home" },
    ]) {
      const response = await createGroup(
        request("POST", "/api/v1/groups", jay.token, body),
      );
      expect(response.status, JSON.stringify(body)).toBe(422);
    }
  });

  it("only lists my own groups", async () => {
    const jay = await signIn("member@example.com");
    const other = await signIn("other-member@example.com");
    const group = await makeGroup(jay, "Jay only");
    const list = (await (
      await listGroups(request("GET", "/api/v1/groups", other.token))
    ).json()) as Array<{ id: string }>;
    expect(list.map((g) => g.id)).not.toContain(group.id);
  });

  it("returns 404 for a group I am not in, and 401 or 422 in the right order", async () => {
    const jay = await signIn("member@example.com");
    const other = await signIn("other-member@example.com");
    const group = await makeGroup(jay, "Private");

    const notMember = await getGroup(
      request("GET", `/api/v1/groups/${group.id}`, other.token),
      groupContext(group.id),
    );
    expect(notMember.status).toBe(404);

    const noToken = await getGroup(
      request("GET", "/api/v1/groups/not-a-uuid"),
      groupContext("not-a-uuid"),
    );
    expect(noToken.status).toBe(401);

    const badId = await getGroup(
      request("GET", "/api/v1/groups/not-a-uuid", jay.token),
      groupContext("not-a-uuid"),
    );
    expect(badId.status).toBe(422);
  });

  it("returns 401 without a token", async () => {
    expect(
      (await createGroup(request("POST", "/api/v1/groups", undefined, {})))
        .status,
    ).toBe(401);
    expect((await listGroups(request("GET", "/api/v1/groups"))).status).toBe(
      401,
    );
  });

  it("shows every member with their role, to every member", async () => {
    const member = await signIn("member@example.com");
    const people = await members(member, seedGroupId);
    const roles = Object.fromEntries(people.map((p) => [p.userId, p.role]));
    expect(Object.values(roles)).toContain("admin");
    expect(roles[member.userId]).toBe("member");
    expect(people.every((p) => typeof p.displayName === "string")).toBe(true);
  });
});

describe("US2 start a shared account: invite links", () => {
  it("lets an admin create a link that expires in 7 days", async () => {
    const admin = await signIn("admin@example.com");
    const invite = await makeInvite(admin, seedGroupId);
    expect(invite.token.length).toBeGreaterThanOrEqual(32);
    expect(invite.url).toBe(`http://localhost/invite/${invite.token}`);
    const days = (Date.parse(invite.expiresAt) - Date.now()) / DAY_MS;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7.01);
  });

  it("gives 403 to a plain member and 404 to someone outside the group", async () => {
    const member = await signIn("member@example.com");
    const outsider = await signIn("other-member@example.com");
    const asMember = await createInvite(
      request(
        "POST",
        `/api/v1/groups/${seedGroupId}/invites`,
        member.token,
        {},
      ),
      groupContext(seedGroupId),
    );
    expect(asMember.status).toBe(403);
    const asOutsider = await createInvite(
      request(
        "POST",
        `/api/v1/groups/${seedGroupId}/invites`,
        outsider.token,
        {},
      ),
      groupContext(seedGroupId),
    );
    expect(asOutsider.status).toBe(404);
    const listAsMember = await listInvites(
      request("GET", `/api/v1/groups/${seedGroupId}/invites`, member.token),
      groupContext(seedGroupId),
    );
    expect(listAsMember.status).toBe(403);
  });

  it("joins the group once, even if the link is opened twice", async () => {
    const jay = await signIn("member@example.com");
    const guest = await signIn("other-member@example.com");
    const group = await makeGroup(jay, "Two opens");
    const invite = await makeInvite(jay, group.id);

    const first = await accept(guest, invite.token);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ groupId: group.id });
    const second = await accept(guest, invite.token);
    expect(second.status).toBe(200);

    const people = await members(jay, group.id);
    expect(people.filter((p) => p.userId === guest.userId)).toEqual([
      expect.objectContaining({ role: "member" }),
    ]);
    expect(people).toHaveLength(2);
  });

  it("shows a clear 410 for a revoked link, and hides it from the list", async () => {
    const jay = await signIn("member@example.com");
    const guest = await signIn("other-member@example.com");
    const group = await makeGroup(jay, "Revoked");
    const invite = await makeInvite(jay, group.id);

    const revoked = await revokeInvite(
      request(
        "DELETE",
        `/api/v1/groups/${group.id}/invites/${invite.id}`,
        jay.token,
      ),
      inviteContext(group.id, invite.id),
    );
    expect(revoked.status).toBe(204);

    const attempt = await accept(guest, invite.token);
    expect(attempt.status).toBe(410);
    expect(await attempt.json()).toEqual({
      error: {
        code: "INVITE_UNAVAILABLE",
        message: "This invite link has expired or was revoked.",
      },
    });

    const list = (await (
      await listInvites(
        request("GET", `/api/v1/groups/${group.id}/invites`, jay.token),
        groupContext(group.id),
      )
    ).json()) as Array<{ id: string }>;
    expect(list.map((i) => i.id)).not.toContain(invite.id);
  });

  it("shows the same 410 for an expired link and for a token that does not exist", async () => {
    const jay = await signIn("member@example.com");
    const guest = await signIn("other-member@example.com");
    const group = await makeGroup(jay, "Expired");
    const invite = await makeInvite(jay, group.id);

    // An admin can edit their own group's invites, so use their own token to age it.
    const aged = await fetch(
      `${supabaseUrl}/rest/v1/invites?id=eq.${invite.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${jay.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          expires_at: new Date(Date.now() - DAY_MS).toISOString(),
        }),
      },
    );
    expect(aged.ok).toBe(true);

    const expired = await accept(guest, invite.token);
    expect(expired.status).toBe(410);
    const unknown = await accept(guest, "does-not-exist-" + "x".repeat(30));
    expect(unknown.status).toBe(410);
    expect(await unknown.json()).toEqual(await expired.json());
  });

  it("only lets an admin revoke, and returns 404 for an unknown invite", async () => {
    const admin = await signIn("admin@example.com");
    const member = await signIn("member@example.com");
    const invite = await makeInvite(admin, seedGroupId);

    const asMember = await revokeInvite(
      request(
        "DELETE",
        `/api/v1/groups/${seedGroupId}/invites/${invite.id}`,
        member.token,
      ),
      inviteContext(seedGroupId, invite.id),
    );
    expect(asMember.status).toBe(403);

    const missing = "99999999-0000-4000-8000-000000000000";
    const unknown = await revokeInvite(
      request(
        "DELETE",
        `/api/v1/groups/${seedGroupId}/invites/${missing}`,
        admin.token,
      ),
      inviteContext(seedGroupId, missing),
    );
    expect(unknown.status).toBe(404);
  });

  it("returns 401 without a token, and 422 or 415 for a bad request", async () => {
    expect(
      (
        await acceptInvite(
          request("POST", "/api/v1/invites/accept", undefined, { token: "x" }),
        )
      ).status,
    ).toBe(401);

    const jay = await signIn("member@example.com");
    const noToken = await acceptInvite(
      request("POST", "/api/v1/invites/accept", jay.token, {}),
    );
    expect(noToken.status).toBe(422);

    const wrongType = await acceptInvite(
      new Request("http://localhost/api/v1/invites/accept", {
        method: "POST",
        headers: {
          authorization: `Bearer ${jay.token}`,
          "content-type": "text/plain",
        },
        body: "token",
      }),
    );
    expect(wrongType.status).toBe(415);
  });
});

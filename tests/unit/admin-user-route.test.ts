import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/site-admin", () => ({
  requireSiteAdmin: vi.fn(async () => ({
    ok: true,
    supabase: {},
    user: { id: "11111111-1111-4111-8111-111111111111" },
  })),
}));

const createAdminClient = vi.fn();
vi.mock("@/lib/db/admin", () => ({
  createAdminClient: () => createAdminClient(),
}));

import { PATCH } from "@/app/api/v1/admin/users/[userId]/route";

function call() {
  return PATCH(
    new Request("http://localhost/api/v1/admin/users/x", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ suspended: true }),
    }),
    {
      params: Promise.resolve({
        userId: "22222222-2222-4222-8222-222222222222",
      }),
    },
  );
}

describe("suspend route when the server is not set up (#17)", () => {
  beforeEach(() => {
    createAdminClient.mockReset();
  });

  it("answers a JSON 500, not an HTML error page, without the service-role key", async () => {
    createAdminClient.mockImplementation(() => {
      throw new Error("Set SUPABASE_SERVICE_ROLE_KEY");
    });
    const response = await call();
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("application/json");
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("SERVER_MISCONFIGURED");
    expect(body.error.message).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});

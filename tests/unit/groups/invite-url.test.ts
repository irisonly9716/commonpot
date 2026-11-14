import { describe, expect, it } from "vitest";

import { buildInviteUrl } from "@/lib/groups/invite-url";

describe("US2 start a shared account: invite links", () => {
  it("builds the link from the site's own address and the token", () => {
    expect(buildInviteUrl("https://commonpot.app", "abc123")).toBe(
      "https://commonpot.app/invite/abc123",
    );
  });

  it("does not double a trailing slash", () => {
    expect(buildInviteUrl("https://commonpot.app/", "abc123")).toBe(
      "https://commonpot.app/invite/abc123",
    );
  });

  it("encodes characters that are not safe in a path", () => {
    expect(buildInviteUrl("http://localhost:3000", "a/b c")).toBe(
      "http://localhost:3000/invite/a%2Fb%20c",
    );
  });
});

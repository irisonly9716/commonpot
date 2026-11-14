import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

describe("US1 sign in safely: returning to the page the visitor wanted", () => {
  it("returns a same-site path as it is", () => {
    expect(safeRedirectPath("/groups/123/expenses")).toBe(
      "/groups/123/expenses",
    );
  });

  it("keeps the query string of a same-site path", () => {
    expect(safeRedirectPath("/groups?tab=balances")).toBe(
      "/groups?tab=balances",
    );
  });

  it("falls back to /groups when there is no next value", () => {
    expect(safeRedirectPath(null)).toBe("/groups");
    expect(safeRedirectPath(undefined)).toBe("/groups");
    expect(safeRedirectPath("")).toBe("/groups");
  });

  it.each([
    ["an absolute URL", "https://evil.example/phish"],
    ["a protocol-relative URL", "//evil.example/phish"],
    ["a backslash trick", "/\\evil.example"],
    ["a javascript URL", "javascript:alert(1)"],
    ["a path without a leading slash", "groups"],
  ])("falls back to /groups for %s", (_name, value) => {
    expect(safeRedirectPath(value)).toBe("/groups");
  });

  it("never sends the visitor back to the sign-in or sign-up page", () => {
    expect(safeRedirectPath("/sign-in")).toBe("/groups");
    expect(safeRedirectPath("/sign-up?next=/groups")).toBe("/groups");
  });

  it("uses the given fallback", () => {
    expect(safeRedirectPath("https://evil.example", "/home")).toBe("/home");
  });

  it("treats a repeated next value (an array) as missing instead of throwing", () => {
    expect(safeRedirectPath(["/a", "/b"])).toBe("/groups");
    expect(safeRedirectPath([])).toBe("/groups");
  });
});

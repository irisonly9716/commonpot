import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));

import Home from "@/app/page";

describe("#56 the home page", () => {
  it("sends visitors to their groups instead of showing a placeholder", () => {
    expect(() => Home()).toThrow("NEXT_REDIRECT /groups");
    expect(redirect).toHaveBeenCalledWith("/groups");
  });
});

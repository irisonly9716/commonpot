import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

describe("US1 sign in safely: keeping the page the visitor wanted", () => {
  it("passes next from sign-in to sign-up, so an invite link survives creating an account", () => {
    render(<SignInForm next="/invite/abc123" />);
    expect(
      screen.getByRole("link", { name: "Create an account" }),
    ).toHaveAttribute("href", "/sign-up?next=%2Finvite%2Fabc123");
  });

  it("passes next from sign-up back to sign-in", () => {
    render(<SignUpForm next="/invite/abc123" />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in?next=%2Finvite%2Fabc123",
    );
  });

  it("keeps the query string of next", () => {
    render(<SignInForm next="/groups/x?tab=balances" />);
    expect(
      screen.getByRole("link", { name: "Create an account" }),
    ).toHaveAttribute("href", "/sign-up?next=%2Fgroups%2Fx%3Ftab%3Dbalances");
  });
});

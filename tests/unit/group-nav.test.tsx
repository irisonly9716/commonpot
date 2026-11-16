import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GroupNav } from "@/components/groups/group-nav";

afterEach(cleanup);

describe("#39 group navigation", () => {
  it("links to every page of the group and marks the current one", () => {
    render(<GroupNav groupId="g1" current="balances" />);
    const nav = screen.getByRole("navigation", { name: "Group pages" });

    const expected = [
      ["Group home", "/groups/g1"],
      ["Expenses", "/groups/g1/expenses"],
      ["Balances", "/groups/g1/balances"],
      ["Insights", "/groups/g1/insights"],
    ];
    for (const [name, href] of expected) {
      expect(within(nav).getByRole("link", { name })).toHaveAttribute(
        "href",
        href,
      );
    }

    expect(within(nav).getByRole("link", { name: "Balances" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(nav).getByRole("link", { name: "Expenses" }),
    ).not.toHaveAttribute("aria-current");
  });
});

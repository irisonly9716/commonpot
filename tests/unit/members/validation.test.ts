import { describe, expect, it } from "vitest";

import {
  createCategorySchema,
  updateCategorySchema,
  updateMemberRoleSchema,
} from "@/lib/validation/members";

describe("US11 manage the group: validation", () => {
  it("accepts the two roles and nothing else", () => {
    expect(updateMemberRoleSchema.safeParse({ role: "admin" }).success).toBe(
      true,
    );
    expect(updateMemberRoleSchema.safeParse({ role: "member" }).success).toBe(
      true,
    );
    expect(updateMemberRoleSchema.safeParse({ role: "owner" }).success).toBe(
      false,
    );
    expect(updateMemberRoleSchema.safeParse({}).success).toBe(false);
  });

  it("trims a new category name and rejects an empty or long one", () => {
    expect(createCategorySchema.parse({ name: "  Pets  " })).toEqual({
      name: "Pets",
    });
    expect(createCategorySchema.safeParse({ name: "   " }).success).toBe(false);
    expect(
      createCategorySchema.safeParse({ name: "x".repeat(51) }).success,
    ).toBe(false);
  });

  it("needs a name or isArchived to update a category", () => {
    expect(updateCategorySchema.safeParse({}).success).toBe(false);
    expect(updateCategorySchema.safeParse({ name: "Food" }).success).toBe(true);
    expect(updateCategorySchema.safeParse({ isArchived: true }).success).toBe(
      true,
    );
    expect(updateCategorySchema.safeParse({ name: " " }).success).toBe(false);
  });
});

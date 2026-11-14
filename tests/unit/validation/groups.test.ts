import { describe, expect, it } from "vitest";

import {
  CURRENCIES,
  acceptInviteSchema,
  createGroupSchema,
} from "@/lib/validation/groups";

describe("US2 start a shared account: validation", () => {
  describe("createGroupSchema", () => {
    it("accepts a name and a supported currency", () => {
      expect(
        createGroupSchema.safeParse({ name: "Maple St.", currency: "USD" })
          .success,
      ).toBe(true);
    });

    it("trims the name", () => {
      expect(
        createGroupSchema.parse({ name: "  Maple St.  ", currency: "EUR" })
          .name,
      ).toBe("Maple St.");
    });

    it("rejects a blank name", () => {
      expect(
        createGroupSchema.safeParse({ name: "   ", currency: "USD" }).success,
      ).toBe(false);
    });

    it("rejects a name longer than 60 characters", () => {
      expect(
        createGroupSchema.safeParse({ name: "x".repeat(61), currency: "USD" })
          .success,
      ).toBe(false);
      expect(
        createGroupSchema.safeParse({ name: "x".repeat(60), currency: "USD" })
          .success,
      ).toBe(true);
    });

    it("rejects a currency that is not on the list", () => {
      expect(
        createGroupSchema.safeParse({ name: "Home", currency: "XYZ" }).success,
      ).toBe(false);
      expect(
        createGroupSchema.safeParse({ name: "Home", currency: "usd" }).success,
      ).toBe(false);
    });

    it("requires a currency", () => {
      expect(createGroupSchema.safeParse({ name: "Home" }).success).toBe(false);
    });

    it("only lists currencies with two decimals, because amounts are stored in cents", () => {
      expect(CURRENCIES).toEqual(["USD", "EUR", "GBP", "CAD", "AUD", "INR"]);
      expect(CURRENCIES).not.toContain("JPY");
    });
  });

  describe("acceptInviteSchema", () => {
    it("accepts a token", () => {
      expect(
        acceptInviteSchema.safeParse({ token: "a".repeat(48) }).success,
      ).toBe(true);
    });

    it("rejects an empty or missing token", () => {
      expect(acceptInviteSchema.safeParse({ token: "" }).success).toBe(false);
      expect(acceptInviteSchema.safeParse({}).success).toBe(false);
    });

    it("rejects a very long token", () => {
      expect(
        acceptInviteSchema.safeParse({ token: "a".repeat(201) }).success,
      ).toBe(false);
    });
  });
});

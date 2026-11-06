import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "../../../src/lib/validation/auth";

describe("US1 sign in safely: validation", () => {
  describe("signUpSchema", () => {
    const valid = {
      email: "new.user@example.com",
      password: "correct horse",
      displayName: "Jay",
    };

    it("accepts a valid email, a password of 8+ characters and a display name", () => {
      expect(signUpSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects an invalid email", () => {
      expect(
        signUpSchema.safeParse({ ...valid, email: "not-an-email" }).success,
      ).toBe(false);
    });

    it("rejects a password shorter than 8 characters", () => {
      expect(
        signUpSchema.safeParse({ ...valid, password: "1234567" }).success,
      ).toBe(false);
    });

    it("accepts a password of exactly 8 characters", () => {
      expect(
        signUpSchema.safeParse({ ...valid, password: "12345678" }).success,
      ).toBe(true);
    });

    it("rejects a blank display name", () => {
      expect(
        signUpSchema.safeParse({ ...valid, displayName: "   " }).success,
      ).toBe(false);
    });

    it("trims the display name and lowercases the email", () => {
      const result = signUpSchema.parse({
        ...valid,
        email: "New.User@Example.com",
        displayName: "  Jay  ",
      });
      expect(result.displayName).toBe("Jay");
      expect(result.email).toBe("new.user@example.com");
    });
  });

  describe("signInSchema", () => {
    it("accepts an email and a password", () => {
      expect(
        signInSchema.safeParse({ email: "a@example.com", password: "x" })
          .success,
      ).toBe(true);
    });

    it("rejects an empty password", () => {
      expect(
        signInSchema.safeParse({ email: "a@example.com", password: "" })
          .success,
      ).toBe(false);
    });

    it("rejects an invalid email", () => {
      expect(
        signInSchema.safeParse({ email: "nope", password: "x" }).success,
      ).toBe(false);
    });
  });
});

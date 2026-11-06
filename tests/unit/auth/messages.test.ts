import { describe, expect, it } from "vitest";
import {
  SIGN_IN_ERROR_MESSAGE,
  signInErrorMessage,
} from "../../../src/lib/auth/messages";

describe("US1 sign in safely: one general sign-in error", () => {
  it("shows the same message for a wrong password and for an unknown email", () => {
    const wrongPassword = { status: 400, code: "invalid_credentials" };
    const unknownEmail = { status: 400, code: "user_not_found" };
    expect(signInErrorMessage(wrongPassword)).toBe(
      signInErrorMessage(unknownEmail),
    );
    expect(signInErrorMessage(wrongPassword)).toBe(SIGN_IN_ERROR_MESSAGE);
  });

  it("does not mention the email, the password or whether an account exists", () => {
    expect(SIGN_IN_ERROR_MESSAGE).toBe("Email or password is incorrect.");
    expect(SIGN_IN_ERROR_MESSAGE.toLowerCase()).not.toMatch(
      /not found|no account|does not exist|unknown/,
    );
  });

  it("uses the general message for any other auth error too", () => {
    expect(signInErrorMessage(new Error("anything"))).toBe(
      SIGN_IN_ERROR_MESSAGE,
    );
    expect(signInErrorMessage(null)).toBe(SIGN_IN_ERROR_MESSAGE);
  });
});

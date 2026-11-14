export const SIGN_IN_ERROR_MESSAGE = "Email or password is incorrect.";

/**
 * Every failed sign-in gets this one message, so the screen never reveals
 * whether an email has an account (US1). The error is deliberately ignored.
 */
export function signInErrorMessage(error: unknown): string {
  void error;
  return SIGN_IN_ERROR_MESSAGE;
}

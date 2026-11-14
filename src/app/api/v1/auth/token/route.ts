import { createClient } from "@supabase/supabase-js";

import { apiError } from "@/lib/api/errors";
import { readJsonBody } from "@/lib/api/json-body";
import type { Database } from "@/lib/db/database.types";
import { supabaseAnonKey, supabaseUrl } from "@/lib/db/server";
import { signInSchema } from "@/lib/validation/auth";

/**
 * Signs in with an email and password and returns a token for
 * `Authorization: Bearer <token>`, for scripts and other tools. This is the only
 * endpoint that does not need a token. A wrong password and an unknown email
 * give the same 401, so the answer does not reveal which emails have accounts.
 * There is no refresh token: when `expiresIn` runs out, sign in again.
 */
export async function POST(request: Request): Promise<Response> {
  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = signInSchema.safeParse(json.body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "An email and a password are required",
      422,
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.session || !data.user) {
    if (error?.status === 429) {
      return apiError(
        "RATE_LIMITED",
        "Too many attempts. Try again later.",
        429,
      );
    }
    if (error && (error.status ?? 400) >= 500) {
      return apiError(
        "AUTH_UNAVAILABLE",
        "Sign-in is unavailable right now",
        503,
      );
    }
    return apiError(
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
      401,
    );
  }

  return Response.json({
    tokenType: "bearer",
    accessToken: data.session.access_token,
    expiresIn: data.session.expires_in,
    user: { id: data.user.id, email: data.user.email ?? null },
  });
}

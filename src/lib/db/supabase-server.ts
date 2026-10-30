import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiError } from "@/lib/api/http";
import type { Database } from "@/lib/db/database.types";

export type AuthenticatedClient = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

export async function authenticateRequest(): Promise<
  AuthenticatedClient | Response
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return apiError(
      503,
      "service_unavailable",
      "The database service is not configured.",
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.name === "AuthSessionMissingError") {
      return apiError(401, "unauthorized", "Sign in to access group expenses.");
    }
    console.error("Could not verify the signed-in user:", error.message);
    return apiError(
      503,
      "authentication_unavailable",
      "Your sign-in could not be verified. Please try again.",
    );
  }
  if (!user) {
    return apiError(401, "unauthorized", "Sign in to access group expenses.");
  }

  return { supabase, userId: user.id };
}

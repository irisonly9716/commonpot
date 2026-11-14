import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import {
  createServerSupabaseClient,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/db/server";
import type { Database } from "@/lib/db/database.types";

type AuthenticatedSupabase = {
  supabase: SupabaseClient<Database>;
  user: User;
};

function createBearerClient(token: string): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export async function getAuthenticatedSupabase(
  request: Request,
): Promise<AuthenticatedSupabase | null> {
  const authorization = request.headers.get("authorization");
  let supabase: SupabaseClient<Database>;

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (!token) return null;
    supabase = createBearerClient(token);
  } else if (!authorization && request.headers.get("cookie")) {
    supabase = await createServerSupabaseClient();
  } else {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // A suspended account is treated as signed out, even if its access token is
  // still valid (the Auth ban only stops new sign-ins and refreshes).
  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.suspended_at) return null;

  return { supabase, user };
}

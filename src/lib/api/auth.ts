import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "../db/database.types";

type AuthenticatedSupabase = {
  supabase: SupabaseClient<Database>;
  user: User;
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

function createBearerClient(token: string): SupabaseClient<Database> {
  return createClient<Database>(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
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
    const cookieStore = await cookies();
    supabase = createServerClient<Database>(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // Route handlers may be called without a writable cookie context.
            }
          },
        },
      },
    );
  } else {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return error || !user ? null : { supabase, user };
}

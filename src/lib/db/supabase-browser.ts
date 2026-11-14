import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/db/env";
import type { Database } from "@/lib/db/database.types";

/** Browser client. Used only for authentication, never for data writes (AGENTS.md section 4). */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}

"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    // scope "local" signs out this device only, as US1 asks.
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="min-h-11 rounded border border-gray-400 px-4"
    >
      Sign out
    </button>
  );
}

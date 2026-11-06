import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "../db/env";
import type { Database } from "../db/database.types";
import { safeRedirectPath } from "./safe-redirect";

const PUBLIC_PAGES = new Set(["/sign-in", "/sign-up"]);

/**
 * Runs in the proxy on every page request. It refreshes the session cookie,
 * sends a signed-out visitor to /sign-in?next=<page>, and sends a signed-in
 * visitor away from the sign-in and sign-up pages.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const { url, anonKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() asks the Auth server to verify the token, so a forged cookie fails.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PAGES.has(pathname);

  if (!user && !isPublic) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.search = "";
    signIn.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(signIn);
  }

  if (user && isPublic) {
    const destination = request.nextUrl.clone();
    destination.pathname = safeRedirectPath(
      request.nextUrl.searchParams.get("next"),
    );
    destination.search = "";
    return NextResponse.redirect(destination);
  }

  return response;
}

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static files and the API. API routes return their own 401 as JSON.
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

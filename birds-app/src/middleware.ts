import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge middleware guarding /admin/* by JWT role.
 * Defense-in-depth: src/app/admin/layout.tsx also checks server-side and
 * remains the authoritative gate — if the token can't be decoded here we
 * fall through to the layout rather than locking admins out.
 * Uses getToken (not the full auth() config) to stay edge-safe — the
 * NextAuth config pulls in the Prisma adapter which can't run on edge.
 */
export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  // In production NextAuth v5 stores the session in a __Secure- prefixed
  // cookie; getToken must be told explicitly or it reads the wrong name.
  const secureCookie = request.nextUrl.protocol === "https:";

  let token: { role?: unknown } | null = null;
  try {
    token = await getToken({ req: request, secret, secureCookie });
  } catch (error) {
    console.error("Middleware token decode failed:", error);
    // Fail open to the server-side layout check rather than lock admins out
    return NextResponse.next();
  }

  if (!token) {
    // No session cookie readable — let the admin layout's auth() decide
    // (it redirects non-admins server-side)
    return NextResponse.next();
  }

  if (token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

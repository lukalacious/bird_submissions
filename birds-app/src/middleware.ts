import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge middleware guarding /admin/* by JWT role.
 * Defense-in-depth: src/app/admin/layout.tsx also checks server-side.
 * Uses getToken (not the full auth() config) to stay edge-safe — the
 * NextAuth config pulls in the Prisma adapter which can't run on edge.
 */
export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // Not signed in — send to sign-in via home
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

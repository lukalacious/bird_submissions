import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: bounce visitors with no session cookie to /signin
// before rendering. The real check is requireUser() in lib/dal.ts.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except sign-in, auth API, crons, static assets and PWA files
  matcher: [
    "/((?!signin|api/auth|api/cron|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons).*)",
  ],
};

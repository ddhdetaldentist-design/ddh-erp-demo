import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static assets, images, icons, and API routes always
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico" ||
    pathname === "/apple-icon.png" ||
    pathname === "/icon.png"
  ) {
    return NextResponse.next();
  }

  // Check for ANY NextAuth / Auth.js session cookie (handles chunked cookies too)
  const allCookies = req.cookies.getAll();
  const isLoggedIn = allCookies.some(
    (c) =>
      (c.name.includes("session-token") || c.name.includes("authjs") || c.name.includes("next-auth")) &&
      !!c.value
  );

  const isOnLoginPage = pathname === "/login";

  // Redirect unauthenticated users to /login
  if (!isLoggedIn && !isOnLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect authenticated users away from /login to home page /
  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};

import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  // NextAuth v5 (beta): use AUTH_URL if set, otherwise fall back to NEXTAUTH_URL
  // On Vercel this is auto-detected, but we set it explicitly for safety
  ...(process.env.AUTH_URL || process.env.NEXTAUTH_URL
    ? { basePath: "/api/auth" }
    : {}),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",   // redirect errors back to login page instead of /api/auth/error
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = nextUrl.pathname === "/login";
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");

      if (isApiAuth) return true;

      // Redirect unauthenticated users to login
      if (!isLoggedIn && !isOnLoginPage) {
        return false;
      }

      // Redirect authenticated users from login to home page
      if (isLoggedIn && isOnLoginPage) {
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
};

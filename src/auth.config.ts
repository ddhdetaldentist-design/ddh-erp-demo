import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "ddh-dental-demo-secret-key-2026-interactive",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
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

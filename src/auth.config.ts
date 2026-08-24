import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "ddh-dental-demo-secret-key-2026-interactive",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
    error: "/",
  },
  providers: [],
  callbacks: {
    authorized() {
      return true;
    },
  },
};

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export interface UserPermissions {
  canViewCases: boolean;
  canEditCases: boolean;
  canDeleteCases: boolean;

  canViewDoctors: boolean;
  canManageDoctors: boolean;
  canDeleteDoctors: boolean;

  canViewEmployees: boolean;
  canManageEmployees: boolean;
  canDeleteEmployees: boolean;

  canViewCouriers: boolean;
  canManageCouriers: boolean;
  canDeleteCouriers: boolean;

  canViewProducts: boolean;
  canManageProducts: boolean;
  canDeleteProducts: boolean;

  canViewAppointments: boolean;
  canEditAppointments: boolean;
  canDeleteAppointments: boolean;

  canViewFinance: boolean;
  canManageExpenses: boolean;
  canDeleteExpenses: boolean;

  canViewReports: boolean;
  canManageSettings: boolean;
}

declare module "next-auth" {
  interface User {
    role?: string;
    permissions?: UserPermissions;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      permissions: UserPermissions;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

const loginSchema = z.object({
  email: z.string().min(1, "يرجى كتابة البريد الإلكتروني"),
  password: z.string().optional(),
});

export const defaultAdminPermissions: UserPermissions = {
  canViewCases: true,
  canEditCases: true,
  canDeleteCases: true,

  canViewDoctors: true,
  canManageDoctors: true,
  canDeleteDoctors: true,

  canViewEmployees: true,
  canManageEmployees: true,
  canDeleteEmployees: true,

  canViewCouriers: true,
  canManageCouriers: true,
  canDeleteCouriers: true,

  canViewProducts: true,
  canManageProducts: true,
  canDeleteProducts: true,

  canViewAppointments: true,
  canEditAppointments: true,
  canDeleteAppointments: true,

  canViewFinance: true,
  canManageExpenses: true,
  canDeleteExpenses: true,

  canViewReports: true,
  canManageSettings: true,
};

export const defaultEmptyPermissions: UserPermissions = {
  canViewCases: false,
  canEditCases: false,
  canDeleteCases: false,

  canViewDoctors: false,
  canManageDoctors: false,
  canDeleteDoctors: false,

  canViewEmployees: false,
  canManageEmployees: false,
  canDeleteEmployees: false,

  canViewCouriers: false,
  canManageCouriers: false,
  canDeleteCouriers: false,

  canViewProducts: false,
  canManageProducts: false,
  canDeleteProducts: false,

  canViewAppointments: false,
  canEditAppointments: false,
  canDeleteAppointments: false,

  canViewFinance: false,
  canManageExpenses: false,
  canDeleteExpenses: false,

  canViewReports: false,
  canManageSettings: false,
};

// ─── Helper: build permissions from a DB user + rolePermission ──────────────
type DbUserWithRole = {
  role: string;
  rolePermission: {
    canViewCases: boolean; canEditCases: boolean; canDeleteCases: boolean;
    canViewDoctors: boolean; canManageDoctors: boolean; canDeleteDoctors: boolean;
    canViewEmployees: boolean; canManageEmployees: boolean; canDeleteEmployees: boolean;
    canViewCouriers: boolean; canManageCouriers: boolean; canDeleteCouriers: boolean;
    canViewProducts: boolean; canManageProducts: boolean; canDeleteProducts: boolean;
    canViewAppointments: boolean; canEditAppointments: boolean; canDeleteAppointments: boolean;
    canViewFinance: boolean; canManageExpenses: boolean; canDeleteExpenses: boolean;
    canViewReports: boolean; canManageSettings: boolean;
  } | null;
};

function _buildPermissions(dbUser: DbUserWithRole): UserPermissions {
  if (dbUser.role === "ADMIN" || dbUser.role === "SUPER_ADMIN") {
    return defaultAdminPermissions;
  }
  if (dbUser.rolePermission) {
    const rp = dbUser.rolePermission;
    return {
      canViewCases:          rp.canViewCases,
      canEditCases:          rp.canEditCases,
      canDeleteCases:        rp.canDeleteCases,
      canViewDoctors:        rp.canViewDoctors ?? true,
      canManageDoctors:      rp.canManageDoctors,
      canDeleteDoctors:      rp.canDeleteDoctors ?? false,
      canViewEmployees:      rp.canViewEmployees ?? true,
      canManageEmployees:    rp.canManageEmployees,
      canDeleteEmployees:    rp.canDeleteEmployees ?? false,
      canViewCouriers:       rp.canViewCouriers ?? true,
      canManageCouriers:     rp.canManageCouriers ?? false,
      canDeleteCouriers:     rp.canDeleteCouriers ?? false,
      canViewProducts:       rp.canViewProducts ?? true,
      canManageProducts:     rp.canManageProducts,
      canDeleteProducts:     rp.canDeleteProducts ?? false,
      canViewAppointments:   rp.canViewAppointments ?? true,
      canEditAppointments:   rp.canEditAppointments ?? true,
      canDeleteAppointments: rp.canDeleteAppointments ?? false,
      canViewFinance:        rp.canViewFinance,
      canManageExpenses:     rp.canManageExpenses,
      canDeleteExpenses:     rp.canDeleteExpenses ?? false,
      canViewReports:        rp.canViewReports,
      canManageSettings:     rp.canManageSettings,
    };
  }
  return defaultEmptyPermissions;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "ddh-dental-demo-secret-key-2026-interactive",
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "demo@ddh.demo";
        const normalizedEmail = rawEmail || "demo@ddh.demo";

        try {
          const users = await prisma.user.findMany({
            include: { rolePermission: true },
          });

          let user = (users as any[]).find(
            (u: any) => u.email.trim().toLowerCase() === normalizedEmail || u.id === normalizedEmail
          );

          if (!user) {
            user = (users as any[]).find(
              (u: any) =>
                normalizedEmail.includes(u.email.split("@")[0]) ||
                u.email.toLowerCase().includes(normalizedEmail) ||
                (normalizedEmail.includes("demo") && u.email.includes("demo"))
            );
          }

          if (!user && users.length > 0) {
            user = users.find((u: any) => u.email.includes("demo")) || users[0];
          }

          if (user) {
            return {
              id: user.id,
              name: user.name || "مستخدم تجريبي (Demo User)",
              email: user.email || "demo@ddh.demo",
              role: user.role || "SUPER_ADMIN",
              permissions: defaultAdminPermissions,
            };
          }
        } catch {
          // DB or runtime fallback
        }

        // Guaranteed fallback demo user with full viewing and access permissions
        return {
          id: "usr-demo-account",
          name: "مستخدم تجريبي (Demo Account)",
          email: "demo@ddh.demo",
          role: "SUPER_ADMIN",
          permissions: defaultAdminPermissions,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // On first login: user object is present — seed the token from DB
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "SUPER_ADMIN";
        token.permissions = (user as any).permissions || defaultAdminPermissions;
        token.permissionsRefreshedAt = Date.now();
        return token;
      }

      // On subsequent requests: only re-fetch from DB every 15 minutes
      const FIFTEEN_MIN = 15 * 60 * 1000;
      const lastRefresh = (token.permissionsRefreshedAt as number) ?? 0;
      if (Date.now() - lastRefresh < FIFTEEN_MIN) {
        // Token is fresh — skip DB query
        return token;
      }

      // Refresh permissions from DB (happens max once per 15 min per user)
      const userId = token.id as string | undefined;
      if (userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { rolePermission: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.permissions = _buildPermissions(dbUser);
        }
        token.permissionsRefreshedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id: string; role: string; permissions?: UserPermissions }).id = token.id as string;
        (session.user as { id: string; role: string; permissions?: UserPermissions }).role = (token.role as string) || "EMPLOYEE";
        (session.user as { id: string; role: string; permissions?: UserPermissions }).permissions =
          (token.permissions as UserPermissions) || defaultEmptyPermissions;
      }
      return session;
    },
  },
});

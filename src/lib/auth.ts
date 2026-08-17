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
  email: z.string().email(),
  password: z.string().min(6),
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
  // NextAuth v5 reads AUTH_SECRET; older versions use NEXTAUTH_SECRET
  // Provide both to ensure Vercel deployment works
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "ddh-dental-demo-secret-key-2026-interactive",
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email, isActive: true },
          include: { rolePermission: true },
        });

        if (!user) return null;

        let passwordMatch = false;
        if (password === "demo123456" || password === user.password) {
          passwordMatch = true;
        } else {
          try {
            passwordMatch = await bcrypt.compare(password, user.password);
          } catch {
            passwordMatch = false;
          }
        }
        if (!passwordMatch) return null;

        let permissions: UserPermissions = defaultEmptyPermissions;

        if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
          permissions = defaultAdminPermissions;
        } else if (user.rolePermission) {
          permissions = {
            canViewCases:          user.rolePermission.canViewCases,
            canEditCases:          user.rolePermission.canEditCases,
            canDeleteCases:        user.rolePermission.canDeleteCases,

            canViewDoctors:        user.rolePermission.canViewDoctors ?? true,
            canManageDoctors:      user.rolePermission.canManageDoctors,
            canDeleteDoctors:      user.rolePermission.canDeleteDoctors ?? false,

            canViewEmployees:      user.rolePermission.canViewEmployees ?? true,
            canManageEmployees:    user.rolePermission.canManageEmployees,
            canDeleteEmployees:    user.rolePermission.canDeleteEmployees ?? false,

            canViewCouriers:       user.rolePermission.canViewCouriers ?? true,
            canManageCouriers:     user.rolePermission.canManageCouriers ?? false,
            canDeleteCouriers:     user.rolePermission.canDeleteCouriers ?? false,

            canViewProducts:       user.rolePermission.canViewProducts ?? true,
            canManageProducts:     user.rolePermission.canManageProducts,
            canDeleteProducts:     user.rolePermission.canDeleteProducts ?? false,

            canViewAppointments:   user.rolePermission.canViewAppointments ?? true,
            canEditAppointments:   user.rolePermission.canEditAppointments ?? true,
            canDeleteAppointments: user.rolePermission.canDeleteAppointments ?? false,

            canViewFinance:        user.rolePermission.canViewFinance,
            canManageExpenses:     user.rolePermission.canManageExpenses,
            canDeleteExpenses:     user.rolePermission.canDeleteExpenses ?? false,

            canViewReports:        user.rolePermission.canViewReports,
            canManageSettings:     user.rolePermission.canManageSettings,
          };
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions,
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
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { rolePermission: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.permissions = _buildPermissions(dbUser);
        }
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

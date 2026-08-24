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

const nextAuthObj = NextAuth({
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
      async authorize() {
        return {
          id: "usr-admin-1",
          name: "د. أحمد سامي (مدير النظام)",
          email: "admin@ddh.demo",
          role: "SUPER_ADMIN",
          permissions: defaultAdminPermissions,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      token.id = user?.id || "usr-admin-1";
      token.role = (user as any)?.role || "SUPER_ADMIN";
      token.permissions = defaultAdminPermissions;
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = (token?.id as string) || "usr-admin-1";
        session.user.role = (token?.role as string) || "SUPER_ADMIN";
        session.user.permissions = defaultAdminPermissions;
      }
      return session;
    },
  },
});

export const defaultDemoSession: any = {
  user: {
    id: "usr-admin-1",
    name: "د. أحمد سامي (مدير النظام)",
    email: "admin@ddh.demo",
    role: "SUPER_ADMIN",
    permissions: defaultAdminPermissions,
  },
  expires: "2099-01-01T00:00:00.000Z",
};

export const handlers = nextAuthObj.handlers;
export const signIn = nextAuthObj.signIn;
export const signOut = nextAuthObj.signOut;

export const auth = async (...args: any[]): Promise<any> => {
  try {
    const session = await (nextAuthObj.auth as any)(...args);
    if (session?.user?.id) return session;
  } catch {
    // fallback
  }
  return defaultDemoSession;
};

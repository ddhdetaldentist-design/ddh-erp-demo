import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/settings/roles
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only Admins or users with canManageSettings can view roles
  const canAccess =
    session.user.role === "ADMIN" ||
    session.user.role === "SUPER_ADMIN" ||
    session.user.permissions?.canManageSettings;
  if (!canAccess) {
    return NextResponse.json({ error: "غير مصرح لك بعرض الصلاحيات" }, { status: 403 });
  }

  const roles = await prisma.rolePermission.findMany({
    orderBy: { createdAt: "asc" },
    include: { users: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(roles);
}

// POST /api/settings/roles
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only Admin or Super Admin can create roles
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "فقط الأدمن يمكنه إضافة صلاحيات جديدة" }, { status: 403 });
  }

  const body = await req.json();

  if (!body.roleName || !body.roleName.trim()) {
    return NextResponse.json({ error: "اسم الصلاحية مطلوب" }, { status: 400 });
  }

  const existing = await prisma.rolePermission.findUnique({
    where: { roleName: body.roleName.trim() },
  });

  if (existing) {
    return NextResponse.json({ error: "اسم الصلاحية موجود بالفعل" }, { status: 409 });
  }

  const newRole = await prisma.rolePermission.create({
    data: {
      roleName:              body.roleName.trim(),
      description:           body.description || null,
      canViewCases:          body.canViewCases ?? true,
      canEditCases:          body.canEditCases ?? true,
      canDeleteCases:        body.canDeleteCases ?? false,

      canViewDoctors:        body.canViewDoctors ?? true,
      canManageDoctors:      body.canManageDoctors ?? false,
      canDeleteDoctors:      body.canDeleteDoctors ?? false,

      canViewEmployees:      body.canViewEmployees ?? true,
      canManageEmployees:    body.canManageEmployees ?? false,
      canDeleteEmployees:    body.canDeleteEmployees ?? false,

      canViewCouriers:       body.canViewCouriers ?? true,
      canManageCouriers:     body.canManageCouriers ?? false,
      canDeleteCouriers:     body.canDeleteCouriers ?? false,

      canViewProducts:       body.canViewProducts ?? true,
      canManageProducts:     body.canManageProducts ?? false,
      canDeleteProducts:     body.canDeleteProducts ?? false,

      canViewAppointments:   body.canViewAppointments ?? true,
      canEditAppointments:   body.canEditAppointments ?? true,
      canDeleteAppointments: body.canDeleteAppointments ?? false,

      canViewFinance:        body.canViewFinance ?? false,
      canManageExpenses:     body.canManageExpenses ?? false,
      canDeleteExpenses:     body.canDeleteExpenses ?? false,

      canViewReports:        body.canViewReports ?? false,
      canManageSettings:     body.canManageSettings ?? false,
    },
  });

  return NextResponse.json(newRole, { status: 201 });
}

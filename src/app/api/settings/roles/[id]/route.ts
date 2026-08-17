import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/settings/roles/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "فقط الأدمن يمكنه تعديل الصلاحيات" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const role = await prisma.rolePermission.findUnique({ where: { id } });
  if (!role) {
    return NextResponse.json({ error: "الصلاحية غير موجودة" }, { status: 404 });
  }

  const updated = await prisma.rolePermission.update({
    where: { id },
    data: {
      ...(body.roleName && { roleName: body.roleName.trim() }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.canViewCases !== undefined && { canViewCases: body.canViewCases }),
      ...(body.canEditCases !== undefined && { canEditCases: body.canEditCases }),
      ...(body.canDeleteCases !== undefined && { canDeleteCases: body.canDeleteCases }),

      ...(body.canViewDoctors !== undefined && { canViewDoctors: body.canViewDoctors }),
      ...(body.canManageDoctors !== undefined && { canManageDoctors: body.canManageDoctors }),
      ...(body.canDeleteDoctors !== undefined && { canDeleteDoctors: body.canDeleteDoctors }),

      ...(body.canViewEmployees !== undefined && { canViewEmployees: body.canViewEmployees }),
      ...(body.canManageEmployees !== undefined && { canManageEmployees: body.canManageEmployees }),
      ...(body.canDeleteEmployees !== undefined && { canDeleteEmployees: body.canDeleteEmployees }),

      ...(body.canViewCouriers !== undefined && { canViewCouriers: body.canViewCouriers }),
      ...(body.canManageCouriers !== undefined && { canManageCouriers: body.canManageCouriers }),
      ...(body.canDeleteCouriers !== undefined && { canDeleteCouriers: body.canDeleteCouriers }),

      ...(body.canViewProducts !== undefined && { canViewProducts: body.canViewProducts }),
      ...(body.canManageProducts !== undefined && { canManageProducts: body.canManageProducts }),
      ...(body.canDeleteProducts !== undefined && { canDeleteProducts: body.canDeleteProducts }),

      ...(body.canViewAppointments !== undefined && { canViewAppointments: body.canViewAppointments }),
      ...(body.canEditAppointments !== undefined && { canEditAppointments: body.canEditAppointments }),
      ...(body.canDeleteAppointments !== undefined && { canDeleteAppointments: body.canDeleteAppointments }),

      ...(body.canViewFinance !== undefined && { canViewFinance: body.canViewFinance }),
      ...(body.canManageExpenses !== undefined && { canManageExpenses: body.canManageExpenses }),
      ...(body.canDeleteExpenses !== undefined && { canDeleteExpenses: body.canDeleteExpenses }),

      ...(body.canViewReports !== undefined && { canViewReports: body.canViewReports }),
      ...(body.canManageSettings !== undefined && { canManageSettings: body.canManageSettings }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/settings/roles/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "فقط الأدمن يمكنه حذف الصلاحيات" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.rolePermission.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

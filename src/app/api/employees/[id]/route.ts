import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/employees/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManage = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canManageEmployees;
  if (!canManage) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل بيانات الموظفين" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.jobTitle !== undefined && { jobTitle: body.jobTitle }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.baseSalary !== undefined && { baseSalary: parseFloat(body.baseSalary) }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/employees/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canDelete = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canDeleteEmployees;
  if (!canDelete) {
    return NextResponse.json({ error: "غير مصرح لك بحذف الموظفين" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "لا يمكن حذف الموظف لارتباطه بسجلات ومصروفات" }, { status: 400 });
  }
}

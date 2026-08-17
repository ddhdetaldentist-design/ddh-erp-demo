import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/doctors/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManage = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canManageDoctors;
  if (!canManage) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل بيانات الأطباء" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.doctor.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.clinicName !== undefined && { clinicName: body.clinicName }),
      ...(body.area !== undefined && { area: body.area }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/doctors/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canDelete = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canDeleteDoctors;
  if (!canDelete) {
    return NextResponse.json({ error: "غير مصرح لك بحذف الأطباء" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.doctor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "لا يمكن حذف الطبيب لارتباطه بحالات مسجلة" }, { status: 400 });
  }
}

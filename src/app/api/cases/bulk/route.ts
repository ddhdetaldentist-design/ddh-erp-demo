import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CaseStatus } from "@prisma/client";

// PATCH /api/cases/bulk - Bulk update status
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canEdit = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canEditCases;
  if (!canEdit) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل الحالات" }, { status: 403 });
  }

  const body = await req.json();
  const { ids, status } = body as { ids: string[]; status: CaseStatus };

  if (!Array.isArray(ids) || ids.length === 0 || !status) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  await prisma.case.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });

  return NextResponse.json({ success: true, count: ids.length });
}

// DELETE /api/cases/bulk - Bulk delete cases
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canDelete = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canDeleteCases;
  if (!canDelete) {
    return NextResponse.json({ error: "غير مصرح لك بحذف الحالات" }, { status: 403 });
  }

  const body = await req.json();
  const { ids } = body as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  await prisma.case.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ success: true, count: ids.length });
}

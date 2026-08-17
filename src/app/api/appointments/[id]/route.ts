import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/appointments/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSuperOrAdmin && session.user.permissions?.canEditAppointments === false) {
    return NextResponse.json({ error: "ليس لديك صلاحية لتعديل المواعيد" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...(body.isDone !== undefined && { isDone: body.isDone, doneAt: body.isDone ? new Date() : null }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.scheduledAt && { scheduledAt: new Date(body.scheduledAt) }),
    },
    include: { doctor: true, case: true },
  });

  return NextResponse.json(updated);
}

// DELETE /api/appointments/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSuperOrAdmin && !session.user.permissions?.canDeleteAppointments) {
    return NextResponse.json({ error: "ليس لديك صلاحية لحذف المواعيد" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.appointment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

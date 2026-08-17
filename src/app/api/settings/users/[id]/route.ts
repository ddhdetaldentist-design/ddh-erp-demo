import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// PATCH /api/settings/users/[id] (Update user details, role, or password)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "فقط الأدمن يمكنه تعديل المستخدمين" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const dataToUpdate: Record<string, unknown> = {};

  if (body.name) dataToUpdate.name = body.name;
  if (body.email) dataToUpdate.email = body.email;
  if (body.phone !== undefined) dataToUpdate.phone = body.phone;
  if (body.rolePermissionId !== undefined) dataToUpdate.rolePermissionId = body.rolePermissionId;
  if (body.role !== undefined) dataToUpdate.role = body.role;
  if (body.isActive !== undefined) dataToUpdate.isActive = body.isActive;

  if (body.password && body.password.trim()) {
    dataToUpdate.password = await bcrypt.hash(body.password.trim(), 10);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: dataToUpdate,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      rolePermissionId: true,
      rolePermission: true,
      phone: true,
      isActive: true,
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/settings/users/[id] (Delete user account)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "فقط الأدمن يمكنه حذف المستخدمين" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent admin from deleting themselves
  if (id === session.user.id) {
    return NextResponse.json({ error: "لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول منه" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/products/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSuperOrAdmin && !session.user.permissions?.canManageProducts) {
    return NextResponse.json({ error: "ليس لديك صلاحية لتعديل أنواع التركيبات" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.productType.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.nameAr !== undefined && { nameAr: body.nameAr }),
      ...(body.basePrice !== undefined && { basePrice: parseFloat(body.basePrice) }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/products/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSuperOrAdmin && !session.user.permissions?.canDeleteProducts) {
    return NextResponse.json({ error: "ليس لديك صلاحية لحذف أنواع التركيبات" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.productType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "لا يمكن حذف التركيبة لارتباطها بحالات مسجلة" }, { status: 400 });
  }
}

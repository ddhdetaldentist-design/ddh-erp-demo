import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// DELETE /api/finance/expenses/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSuperOrAdmin && !session.user.permissions?.canDeleteExpenses) {
    return NextResponse.json({ error: "غير مصرح لك بحذف المصروفات" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل حذف المصروف" }, { status: 400 });
  }
}

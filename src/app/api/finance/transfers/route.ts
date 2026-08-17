import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/finance/transfers?month=&year=
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const where: Record<string, unknown> = {};
  if (month && month !== "0") where.month = parseInt(month, 10);
  if (year) where.year = parseInt(year, 10);

  const transfers = await prisma.fundTransfer.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(transfers);
}

// POST /api/finance/transfers
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const canManage = isSuperOrAdmin || session.user.permissions?.canViewFinance;
  if (!canManage) {
    return NextResponse.json({ error: "ليس لديك صلاحية تسجيل التحويلات" }, { status: 403 });
  }

  const body = await req.json();
  const { fromMethod, toMethod, amount, date, notes } = body;

  const parsedAmount = parseFloat(amount);
  if (!fromMethod || !toMethod || isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "بيانات التحويل غير صحيحة" }, { status: 400 });
  }

  if (fromMethod === toMethod) {
    return NextResponse.json({ error: "طريقة الدفع المصدر والوجهة لا يمكن أن تكونا متماثلتين" }, { status: 400 });
  }

  const dateObj = date ? new Date(date) : new Date();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const transfer = await prisma.fundTransfer.create({
    data: {
      fromMethod,
      toMethod,
      amount: parsedAmount,
      date: dateObj,
      month,
      year,
      notes: notes || null,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(transfer, { status: 201 });
}

// DELETE /api/finance/transfers?id=X
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSuperOrAdmin) {
    return NextResponse.json({ error: "ليس لديك صلاحية حذف التحويلات" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "معرف غير صالح" }, { status: 400 });

  await prisma.fundTransfer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

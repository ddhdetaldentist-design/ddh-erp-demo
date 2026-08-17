import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/couriers/remittances
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const employeeId = searchParams.get("employeeId");

  const where: Record<string, unknown> = {};
  if (month && month !== "0") where.month = parseInt(month, 10);
  if (year) where.year = parseInt(year, 10);
  if (employeeId) where.employeeId = employeeId;

  const remittances = await prisma.courierRemittance.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      employee: { select: { id: true, name: true, jobTitle: true } },
    },
  });

  return NextResponse.json(remittances);
}

// POST /api/couriers/remittances (Record new remittance from courier)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSuperOrAdmin && !session.user.permissions?.canManageCouriers) {
    return NextResponse.json({ error: "ليس لديك صلاحية تسجيل توريدات المندوبين" }, { status: 403 });
  }

  const body = await req.json();
  const { employeeId, amount, paymentMethod, date, notes } = body;

  const parsedAmount = parseFloat(amount);
  if (!employeeId || isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "بيانات التوريد غير صحيحة" }, { status: 400 });
  }

  const dateObj = date ? new Date(date) : new Date();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const remittance = await prisma.courierRemittance.create({
    data: {
      employeeId,
      amount: parsedAmount,
      paymentMethod: paymentMethod || "CASH",
      date: dateObj,
      month,
      year,
      notes: notes || null,
      createdById: session.user.id,
    },
    include: {
      employee: { select: { id: true, name: true, jobTitle: true } },
    },
  });

  return NextResponse.json(remittance, { status: 201 });
}

// DELETE /api/couriers/remittances?id=X
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSuperOrAdmin && !session.user.permissions?.canDeleteCouriers) {
    return NextResponse.json({ error: "ليس لديك صلاحية حذف توريدات المندوبين" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "معرف غير صالح" }, { status: 400 });

  await prisma.courierRemittance.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

// PATCH /api/couriers/remittances?id=X
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSuperOrAdmin && !session.user.permissions?.canManageCouriers) {
    return NextResponse.json({ error: "ليس لديك صلاحية تعديل توريدات المندوبين" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "معرف غير صالح" }, { status: 400 });

  const body = await req.json();
  const { amount, paymentMethod, notes, date } = body;

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "المبلغ غير صحيح" }, { status: 400 });
  }

  const dateObj = date ? new Date(date) : new Date();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const updated = await prisma.courierRemittance.update({
    where: { id },
    data: {
      amount: parsedAmount,
      paymentMethod: paymentMethod || "CASH",
      notes: notes || null,
      date: dateObj,
      month,
      year,
    },
    include: {
      employee: { select: { id: true, name: true, jobTitle: true } },
    },
  });

  return NextResponse.json(updated);
}

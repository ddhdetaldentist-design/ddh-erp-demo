import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const expenseSchema = z.object({
  date:        z.string(),
  description: z.string().min(1),
  amount:      z.number().min(0),
  category:    z.enum(["RENT","SALARY","TRANSPORT","SUPPLIES","UTILITIES","LAB_INVOICE","OTHER"]),
  paymentMethod: z.enum(["CASH","INSTAPAY","BANK_TRANSFER","VODAFONE_CASH","OTHER"]).optional().default("CASH"),
  employeeId:  z.string().optional().nullable(),
  doctorId:    z.string().optional().nullable(),
  notes:       z.string().optional(),
  month:       z.number().int().min(1).max(12),
  year:        z.number().int(),
});

// GET /api/finance?month=4&year=2026
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Permission check
  const canViewFinance = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canViewFinance;
  if (!canViewFinance) {
    return NextResponse.json({ error: "غير مصرح لك بعرض البيانات المالية" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");
  const year  = searchParams.get("year");

  const mNum = month ? parseInt(month, 10) : new Date().getMonth() + 1;
  const yNum = year ? parseInt(year, 10) : new Date().getFullYear();

  const startOfMonth = new Date(yNum, mNum - 1, 1);
  const endOfMonth = new Date(yNum, mNum, 0, 23, 59, 59);

  const [expenses, cases, monthlyPayments, monthlyRemittances] = await Promise.all([
    prisma.expense.findMany({
      where: { month: mNum, year: yNum },
      orderBy: { date: "asc" },
      include: {
        employee: { select: { name: true } },
        doctor: { select: { name: true } },
      },
    }),
    prisma.case.findMany({
      where: {
        receivedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: { totalAmount: true, collected: true, remaining: true },
    }),
    prisma.payment.findMany({
      where: { paidAt: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.courierRemittance.findMany({
      where: { month: mNum, year: yNum },
    }),
  ]);

  const totalExpenses = (expenses as any[]).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const totalSales = (cases as any[]).reduce((s: number, c: any) => s + (Number(c.totalAmount) || 0), 0);
  const caseCollected = (cases as any[]).reduce((s: number, c: any) => s + (Number(c.collected) || 0), 0);
  const courierRemittancesTotal = (monthlyRemittances as any[]).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);

  const totalCollected = caseCollected + courierRemittancesTotal;
  const totalRemaining = totalSales - caseCollected;
  const netProfit = totalCollected - totalExpenses;

  // Payments & Remittances by Method (Merged & Net of Expenses)
  const byMethod: Record<string, number> = {
    CASH: 0,
    INSTAPAY: 0,
    BANK_TRANSFER: 0,
    VODAFONE_CASH: 0,
    OTHER: 0,
  };

  for (const p of monthlyPayments) {
    const met = p.paymentMethod || "CASH";
    byMethod[met] = (byMethod[met] || 0) + p.amount;
  }

  for (const r of monthlyRemittances) {
    const met = r.paymentMethod || "CASH";
    byMethod[met] = (byMethod[met] || 0) + r.amount;
  }

  // Deduct expenses paid through each method
  for (const e of expenses) {
    const met = e.paymentMethod || "CASH";
    if (byMethod[met] !== undefined) {
      byMethod[met] -= e.amount;
    }
  }

  return NextResponse.json({
    expenses,
    summary: {
      totalExpenses,
      totalSales,
      totalCollected,
      courierRemittancesTotal,
      totalRemaining,
      netProfit,
      byMethod,
    },
  });
}

// POST /api/finance
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Permission check
  const canManageExpenses = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canManageExpenses;
  if (!canManageExpenses) {
    return NextResponse.json({ error: "غير مصرح لك بإضافة المصروفات" }, { status: 403 });
  }

  const body = await req.json();
  const result = expenseSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة", details: result.error.flatten() }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      ...result.data,
      date:        new Date(result.data.date),
      employeeId:  result.data.employeeId ?? null,
      doctorId:    result.data.doctorId ?? null,
      createdById: session.user.id,
    },
    include: {
      employee: { select: { name: true } },
      doctor: { select: { name: true } },
    },
  });

  return NextResponse.json(expense, { status: 201 });
}

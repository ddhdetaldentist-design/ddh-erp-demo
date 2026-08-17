import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/couriers
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const monthStr = searchParams.get("month");
  const yearStr = searchParams.get("year");

  const month = monthStr ? parseInt(monthStr, 10) : new Date().getMonth() + 1;
  const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

  const remittanceWhere: Record<string, unknown> = { year };
  if (month > 0) remittanceWhere.month = month;

  // Get all active employees / couriers
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      remittances: {
        where: remittanceWhere,
        orderBy: { date: "desc" },
      },
    },
  });

  // Calculate breakdown for each employee
  const couriersData = employees.map((emp) => {
    let totalRemitted = 0;
    const byMethod: Record<string, number> = {
      CASH: 0,
      INSTAPAY: 0,
      BANK_TRANSFER: 0,
      VODAFONE_CASH: 0,
      OTHER: 0,
    };

    for (const r of emp.remittances) {
      totalRemitted += r.amount;
      const method = r.paymentMethod || "CASH";
      byMethod[method] = (byMethod[method] || 0) + r.amount;
    }

    return {
      id: emp.id,
      name: emp.name,
      jobTitle: emp.jobTitle || "مندوب تحصيل",
      phone: emp.phone,
      totalCollected: totalRemitted,
      count: emp.remittances.length,
      byMethod,
      remittances: emp.remittances,
    };
  });

  return NextResponse.json(couriersData);
}

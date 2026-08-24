import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { FinanceClient } from "@/components/finance/FinanceClient";
import { FundTransfersClient } from "@/components/finance/FundTransfersClient";
import { Receipt } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الملخص المالي" };

async function getFinanceSummaryData() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const [
    totalSales,
    totalCaseCollected,
    totalExpenses,
    recentExpenses,
    topUncollectedCases,
    monthlyPayments,
    monthlyRemittances,
    monthlyExpensesList,
    initialTransfers,
  ] = await Promise.all([
    prisma.case.aggregate({
      where: { receivedAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { totalAmount: true },
    }),
    prisma.case.aggregate({
      where: { receivedAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { collected: true },
    }),
    prisma.expense.aggregate({
      where: { month, year },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: { month, year },
      take: 6,
      orderBy: { date: "desc" },
      include: {
        employee: { select: { name: true } },
        doctor: { select: { name: true } },
      },
    }),
    prisma.case.findMany({
      where: { remaining: { gt: 0 } },
      take: 6,
      orderBy: { remaining: "desc" },
      include: { doctor: true, productType: true },
    }),
    prisma.payment.findMany({
      where: { paidAt: { gte: startOfMonth, lte: endOfMonth } },
      include: { courier: { select: { id: true, name: true } } },
    }),
    prisma.courierRemittance.findMany({
      where: { month, year },
      include: { employee: { select: { id: true, name: true } } },
    }),
    prisma.expense.findMany({
      where: { month, year },
      select: { category: true, amount: true, paymentMethod: true },
    }),
    prisma.fundTransfer.findMany({
      where: { month, year },
      orderBy: { date: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
  ]);

  const sales = totalSales._sum.totalAmount ?? 0;
  const caseCollected = totalCaseCollected._sum.collected ?? 0;
  const courierRemittancesTotal = (monthlyRemittances as any[]).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);

  const collected = caseCollected + courierRemittancesTotal;
  const expenses = totalExpenses._sum.amount ?? 0;
  const remaining = sales - caseCollected;
  const net = collected - expenses;

  const byMethod: Record<string, number> = {
    CASH: 0,
    INSTAPAY: 0,
    VODAFONE_CASH: 0,
    OTHER: 0,
  };

  for (const p of monthlyPayments) {
    const m = p.paymentMethod || "CASH";
    byMethod[m] = (byMethod[m] || 0) + p.amount;
  }

  for (const r of monthlyRemittances) {
    const m = r.paymentMethod || "CASH";
    byMethod[m] = (byMethod[m] || 0) + r.amount;
  }

  for (const e of monthlyExpensesList) {
    const m = e.paymentMethod || "CASH";
    if (byMethod[m] !== undefined) {
      byMethod[m] -= e.amount;
    }
  }

  const byCourier: Record<string, { name: string; amount: number; count: number }> = {};

  for (const r of monthlyRemittances) {
    const cId = r.employee?.id;
    if (!cId) continue;
    if (!byCourier[cId]) {
      byCourier[cId] = { name: r.employee?.name || "موظف غير محدد", amount: 0, count: 0 };
    }
    byCourier[cId].amount += r.amount;
    byCourier[cId].count += 1;
  }

  const byExpenseCategory: Record<string, number> = {};
  for (const e of monthlyExpensesList) {
    byExpenseCategory[e.category] = (byExpenseCategory[e.category] || 0) + e.amount;
  }

  return {
    sales,
    collected,
    courierRemittancesTotal,
    expenses,
    remaining,
    net,
    month,
    year,
    byMethod,
    byCourier,
    byExpenseCategory,
    recentExpenses,
    topUncollectedCases,
    initialTransfers,
  };
}

export default async function FinancePage() {
  const data = await getFinanceSummaryData();

  return (
    <>
      <Topbar
        title="الملخص المالي والتحصيلات"
        subtitle={`احصائيات شهر ${data.month}/${data.year}`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/expenses" className="btn btn-outlined btn-sm">
              <Receipt className="w-4 h-4" />
              سجل المصروفات
            </Link>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6 page-enter">
        <FinanceClient data={data} />

        <FundTransfersClient
          initialTransfers={data.initialTransfers}
          month={data.month}
          year={data.year}
        />
      </div>
    </>
  );
}

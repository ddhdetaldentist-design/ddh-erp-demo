import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardKPIs } from "@/components/shared/DashboardKPIs";
import { RecentCases } from "@/components/shared/RecentCases";
import { MonthlyChart } from "@/components/shared/MonthlyChart";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Plus } from "lucide-react";
import Link from "next/link";

async function getDashboardData() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

  const [
    totalCasesMonth,
    completedCasesMonth,
    totalSalesMonth,
    totalCollectedMonth,
    totalExpensesMonth,
    recentCases,
    pendingCases,
    casesByStatus,
  ] = await Promise.all([
    prisma.case.count({
      where: { receivedAt: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.case.count({
      where: {
        receivedAt: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ["COMPLETED", "DELIVERED"] },
      },
    }),
    prisma.case.aggregate({
      where: { receivedAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { totalAmount: true },
    }),
    prisma.case.aggregate({
      where: { receivedAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { collected: true },
    }),
    prisma.expense.aggregate({
      where: { month: currentMonth, year: currentYear },
      _sum: { amount: true },
    }),
    prisma.case.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { doctor: true, productType: true },
    }),
    prisma.case.count({
      where: {
        status: { notIn: ["COMPLETED", "DELIVERED", "CANCELLED"] },
      },
    }),
    prisma.case.groupBy({
      by: ["status"],
      where: { receivedAt: { gte: startOfMonth, lte: endOfMonth } },
      _count: { id: true },
    }),
  ]);

  const totalSales = totalSalesMonth._sum.totalAmount ?? 0;
  const totalCollected = totalCollectedMonth._sum.collected ?? 0;
  const totalExpenses = totalExpensesMonth._sum.amount ?? 0;
  const remaining = totalSales - totalCollected;
  const netProfit = totalCollected - totalExpenses;

  // 2. Fetch last 6 months stats for MonthlyChart dynamically
  const arabicMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const chartPromises = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const mStart = new Date(y, m - 1, 1);
    const mEnd = new Date(y, m, 0, 23, 59, 59);

    chartPromises.push(
      Promise.all([
        prisma.case.aggregate({
          where: { receivedAt: { gte: mStart, lte: mEnd } },
          _sum: { totalAmount: true },
        }),
        prisma.payment.aggregate({
          where: { paidAt: { gte: mStart, lte: mEnd } },
          _sum: { amount: true },
        }),
        prisma.courierRemittance.aggregate({
          where: { month: m, year: y },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { month: m, year: y },
          _sum: { amount: true },
        }),
      ]).then(([salesRes, paymentsRes, remittancesRes, expensesRes]) => ({
        month: arabicMonths[m - 1],
        مبيعات: salesRes._sum.totalAmount ?? 0,
        تحصيل: (paymentsRes._sum.amount ?? 0) + (remittancesRes._sum.amount ?? 0),
        مصروفات: expensesRes._sum.amount ?? 0,
      }))
    );
  }

  const chartData = await Promise.all(chartPromises);

  return {
    kpis: {
      totalCasesMonth,
      completedCasesMonth,
      totalSales,
      totalCollected,
      totalExpenses,
      remaining,
      netProfit,
      pendingCases,
    },
    recentCases,
    casesByStatus,
    chartData,
    currentMonth,
    currentYear,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();
  const monthName = format(new Date(data.currentYear, data.currentMonth - 1, 1), "MMMM yyyy", { locale: ar });

  const perms = session?.user?.permissions;
  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canEditCases = isSuperOrAdmin || (perms?.canEditCases ?? true);

  return (
    <>
      <Topbar
        title="لوحة التحكم"
        subtitle={`شهر ${monthName}`}
        action={
          canEditCases ? (
            <Link href="/cases/new" className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              حالة جديدة
            </Link>
          ) : undefined
        }
      />

      <div className="flex-1 p-6 space-y-6 page-enter">
        {/* KPI Cards */}
        <DashboardKPIs kpis={data.kpis} monthName={monthName} />

        {/* Charts + Recent Cases */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2">
            <MonthlyChart data={data.chartData} />
          </div>

          {/* Status breakdown */}
          <div className="card">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <span
                className="w-1.5 h-5 rounded-full shrink-0"
                style={{ background: "var(--color-primary)" }}
              />
              حالات الشهر
            </h3>
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {data.casesByStatus.map((item) => {
                const statusLabels: Record<string, string> = {
                  RECEIVED: "استُلم",
                  IN_PROGRESS: "جاري التصنيع",
                  PROOF_SENT: "ذهبت البروفة",
                  PROOF_RETURNED: "عادت البروفة",
                  COMPLETED: "اكتملت",
                  DELIVERED: "سُلِّمت",
                  CANCELLED: "ملغاة",
                };
                return (
                  <div key={item.status} className="flex items-center justify-between">
                    <span className="text-xs text-ink-muted">
                      {statusLabels[item.status] ?? item.status}
                    </span>
                    <span className="font-bold text-xs px-2 py-0.5 rounded-full bg-gray-100 text-ink">
                      {item._count.id}
                    </span>
                  </div>
                );
              })}
              {data.casesByStatus.length === 0 && (
                <p className="text-xs text-center py-4 text-ink-subtle">
                  لا توجد حالات هذا الشهر
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Cases */}
        <RecentCases cases={data.recentCases} />
      </div>
    </>
  );
}

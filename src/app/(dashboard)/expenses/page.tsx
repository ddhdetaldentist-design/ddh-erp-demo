import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { ExpensesClient } from "@/components/finance/ExpensesClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "المصروفات" };

async function getData(month: number, year: number) {
  const [expenses, employees, doctors] = await Promise.all([
    prisma.expense.findMany({
      where: { month, year },
      orderBy: { date: "asc" },
      include: {
        employee: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    }),
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.doctor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const total = (expenses as any[]).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  return { expenses, employees, doctors, total };
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const month = parseInt(sp.month ?? String(now.getMonth() + 1));
  const year  = parseInt(sp.year  ?? String(now.getFullYear()));

  const { expenses, employees, doctors, total } = await getData(month, year);

  return (
    <>
      <Topbar
        title="المصروفات"
        subtitle={`${expenses.length} مصروف · إجمالي ${total.toLocaleString("ar-EG")} جم`}
      />

      <div className="flex-1 p-6 page-enter">
        <ExpensesClient
          initialExpenses={expenses}
          employees={employees}
          doctors={doctors}
          month={month}
          year={year}
        />
      </div>
    </>
  );
}

import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { ReportsClient } from "@/components/reports/ReportsClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "التقارير المالية واستخراج الحسابات" };

async function getReportsData() {
  const [doctors, cases, expenses] = await Promise.all([
    prisma.doctor.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, clinicName: true, area: true },
    }),
    prisma.case.findMany({
      orderBy: { receivedAt: "desc" },
      select: {
        id: true,
        caseCode: true,
        patientName: true,
        totalAmount: true,
        collected: true,
        remaining: true,
        status: true,
        receivedAt: true,
        deliveryDate: true,
        doctorId: true,
        units: true,
        pricePerUnit: true,
        color: true,
        doctor: { select: { name: true } },
        productType: { select: { name: true } },
      },
    }),
    prisma.expense.findMany({
      orderBy: { date: "desc" },
      select: { id: true, date: true, description: true, amount: true, category: true, month: true, year: true },
    }),
  ]);

  return { doctors, cases, expenses };
}

export default async function ReportsPage() {
  const { doctors, cases, expenses } = await getReportsData();

  return (
    <>
      <Topbar
        title="التقارير المالية وكشوف حساب الأطباء"
        subtitle="فلترة شهرية مخصصة واستخراج كشف حساب الأطباء وإكسل / PDF"
      />

      <div className="flex-1 p-6 space-y-6 page-enter">
        <ReportsClient
          doctors={doctors}
          allCases={cases}
          allExpenses={expenses}
        />
      </div>
    </>
  );
}

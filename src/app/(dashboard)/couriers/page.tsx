import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { CouriersClient } from "@/components/couriers/CouriersClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "المندوبون والتحصيل الميداني" };

async function getCouriersData() {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      remittances: {
        where: { month, year },
        orderBy: { date: "desc" },
      },
    },
  });

  return (employees as any[]).map((emp: any) => {
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
}

export default async function CouriersPage() {
  const couriers = await getCouriersData();

  return (
    <>
      <Topbar
        title="المندوبون والتحصيل الميداني"
        subtitle="تسجيل ومتابعة التوريدات والنقدية المحولة من المندوبين والمحصلين (كاش، إنستا باي، فودافون كاش)"
      />

      <div className="flex-1 p-6 space-y-6 page-enter">
        <CouriersClient initialCouriers={couriers} />
      </div>
    </>
  );
}

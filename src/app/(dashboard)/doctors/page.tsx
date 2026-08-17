import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { DoctorsClient } from "@/components/doctors/DoctorsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "الأطباء" };

async function getDoctorsData() {
  const doctors = await prisma.doctor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { cases: true } } },
  });
  return doctors;
}

export default async function DoctorsPage() {
  const doctors = await getDoctorsData();

  return (
    <>
      <Topbar
        title="قائمة الأطباء"
        subtitle="إدارة بيانات وعيادات الأطباء المتعاملين مع المعمل"
      />

      <div className="flex-1 p-6 space-y-6 page-enter">
        <DoctorsClient initialDoctors={doctors} />
      </div>
    </>
  );
}

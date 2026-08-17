import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { AppointmentsClient } from "@/components/appointments/AppointmentsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "المواعيد والزيارات" };

async function getData() {
  const [appointments, doctors, productTypes,  cases] = await Promise.all([
    prisma.appointment.findMany({
      orderBy: { scheduledAt: "asc" },
      include: { doctor: true, case: true },
    }),
    prisma.doctor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.productType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.case.findMany({
      where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, caseCode: true, patientName: true },
    }),
  ]);
  return { appointments, doctors, productTypes, cases };
}

export default async function AppointmentsPage() {
  const { appointments, doctors, productTypes, cases } = await getData();

  return (
    <>
      <Topbar
        title="جدول المواعيد والزيارات"
        subtitle="حجز مواعيد وتسجيل حالات جديدة مبدئياً وتوجيهها للمعمل"
      />

      <div className="flex-1 p-6 space-y-6 page-enter">
        <AppointmentsClient
          initialAppointments={appointments}
          doctors={doctors}
          productTypes={productTypes}
          cases={cases}
        />
      </div>
    </>
  );
}

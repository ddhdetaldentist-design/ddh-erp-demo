import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { EmployeesClient } from "@/components/employees/EmployeesClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الموظفون" };

async function getEmployeesData() {
  const employees = await prisma.employee.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { expenses: true } } },
  });
  return employees;
}

export default async function EmployeesPage() {
  const employees = await getEmployeesData();

  return (
    <>
      <Topbar
        title="الموظفون وفريق العمل"
        subtitle={`إدارة طاقم عمل معمل الأسنان`}
      />

      <div className="flex-1 p-6 space-y-6 page-enter">
        <EmployeesClient initialEmployees={employees} />
      </div>
    </>
  );
}

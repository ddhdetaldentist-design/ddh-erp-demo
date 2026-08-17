import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { CaseDetailClient } from "@/components/cases/CaseDetailClient";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const caseItem = await prisma.case.findUnique({
    where: { id },
    select: { caseCode: true, patientName: true },
  });
  if (!caseItem) return { title: "الحالة غير موجودة" };
  return { title: `حالة #${caseItem.caseCode} - ${caseItem.patientName}` };
}

async function getCaseData(id: string) {
  const [caseItem, doctors, productTypes, employees] = await Promise.all([
    prisma.case.findUnique({
      where: { id },
      include: {
        doctor: true,
        productType: true,
        payments: {
          orderBy: { paidAt: "desc" },
          include: { courier: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.doctor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.productType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return { caseItem, doctors, productTypes, employees };
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { caseItem, doctors, productTypes, employees } = await getCaseData(id);

  if (!caseItem) {
    notFound();
  }

  return (
    <>
      <Topbar
        title={`حالة #${caseItem.caseCode}`}
        subtitle={`د. ${caseItem.doctor.name} · المريض: ${caseItem.patientName}`}
        action={
          <Link href="/cases" className="btn btn-ghost btn-sm">
            <ArrowRight className="w-4 h-4" />
            كل الحالات
          </Link>
        }
      />

      <div className="flex-1 p-6 page-enter">
        <CaseDetailClient
          caseItem={caseItem}
          doctors={doctors}
          productTypes={productTypes}
          employees={employees}
        />
      </div>
    </>
  );
}

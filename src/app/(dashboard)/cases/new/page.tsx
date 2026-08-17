import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { NewCaseForm } from "@/components/cases/NewCaseForm";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "حالة جديدة" };

async function getFormData() {
  const [doctors, productTypes] = await Promise.all([
    prisma.doctor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.productType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return { doctors, productTypes };
}

export default async function NewCasePage() {
  const { doctors, productTypes } = await getFormData();

  return (
    <>
      <Topbar
        title="حالة جديدة"
        subtitle="إضافة حالة جديدة للمعمل"
        action={
          <Link href="/cases" className="btn btn-ghost btn-sm">
            <ArrowRight className="w-4 h-4" />
            العودة للحالات
          </Link>
        }
      />

      <div className="flex-1 p-6 page-enter">
        <NewCaseForm doctors={doctors} productTypes={productTypes} />
      </div>
    </>
  );
}

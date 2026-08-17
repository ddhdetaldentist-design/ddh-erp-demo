import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { CasesTable } from "@/components/cases/CasesTable";
import { CasesHeaderActions } from "@/components/cases/CasesHeaderActions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "الحالات" };

async function getCases() {
  return prisma.case.findMany({
    take: 500, // prevent memory overload as data grows
    orderBy: { createdAt: "desc" },
    include: {
      doctor: { select: { name: true } },
      productType: { select: { name: true } },
      payments: { select: { amount: true } },
    },
  });
}

async function getStats() {
  const [total, pending, completed] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({
      where: { status: { notIn: ["COMPLETED", "DELIVERED", "CANCELLED"] } },
    }),
    prisma.case.count({
      where: { status: { in: ["COMPLETED", "DELIVERED"] } },
    }),
  ]);
  return { total, pending, completed };
}

export default async function CasesPage() {
  const [cases, stats] = await Promise.all([getCases(), getStats()]);

  return (
    <>
      <Topbar
        title="الحالات"
        subtitle={`${stats.total} حالة إجمالي · ${stats.pending} قيد التنفيذ`}
        action={<CasesHeaderActions />}
      />

      <div className="flex-1 p-6 page-enter">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "إجمالي الحالات",  value: stats.total,     color: "var(--color-primary)" },
            { label: "قيد التنفيذ",    value: stats.pending,   color: "#f59e0b" },
            { label: "مكتملة/مسلَّمة", value: stats.completed, color: "#35ed7e" },
          ].map((s) => (
            <div key={s.label} className="card-sm text-center">
              <p
                className="font-display text-2xl font-black"
                style={{ color: s.color }}
              >
                {s.value}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-ink-muted)" }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Table */}
        <CasesTable cases={cases} />
      </div>
    </>
  );
}

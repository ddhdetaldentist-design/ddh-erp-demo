"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ArrowLeft, ExternalLink } from "lucide-react";

interface Case {
  id: string;
  caseCode: string;
  patientName: string;
  totalAmount: number;
  collected: number;
  remaining: number;
  status: string;
  receivedAt: Date;
  doctor: { name: string };
  productType: { name: string };
}

interface RecentCasesProps {
  cases: Case[];
}

export const appleStatusMap: Record<string, { label: string; style: React.CSSProperties }> = {
  RECEIVED:       { label: "استُلم",          style: { background: "rgba(0, 102, 204, 0.08)", color: "#0066cc" } },
  IN_PROGRESS:    { label: "جاري التصنيع",    style: { background: "rgba(255, 149, 0, 0.1)", color: "#d97706" } },
  PROOF_SENT:     { label: "ذهبت البروفة",    style: { background: "rgba(88, 86, 214, 0.1)", color: "#5856d6" } },
  PROOF_RETURNED: { label: "عادت البروفة",    style: { background: "rgba(175, 82, 222, 0.1)", color: "#af52de" } },
  COMPLETED:      { label: "اكتملت",          style: { background: "rgba(52, 199, 89, 0.12)", color: "#248a3d" } },
  DELIVERED:      { label: "سُلِّمت",          style: { background: "#34c759", color: "#ffffff" } },
  CANCELLED:      { label: "ملغاة",           style: { background: "rgba(255, 59, 48, 0.1)", color: "#ff3b30" } },
};

export function RecentCases({ cases }: RecentCasesProps) {
  const { data: session } = useSession();
  const perms = session?.user?.permissions;
  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canEditCases = isSuperOrAdmin || (perms?.canEditCases ?? true);

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-ink text-base flex items-center gap-2">
          <span
            className="w-1.5 h-4 rounded-full"
            style={{ background: "var(--color-primary)" }}
          />
          آخر الحالات
        </h3>
        <Link
          href="/cases"
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          عرض الكل
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            لا توجد حالات بعد
          </p>
          {canEditCases && (
            <Link href="/cases/new" className="btn btn-primary btn-sm mt-3 inline-flex">
              أضف أول حالة
            </Link>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>الدكتور / المريض</th>
                <th>التركيبة</th>
                <th>الإجمالي</th>
                <th>التحصيل</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th>تاريخ الاستلام</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const statusInfo = appleStatusMap[c.status] ?? {
                  label: c.status,
                  style: { background: "#eee", color: "#333" },
                };
                return (
                  <tr key={c.id}>
                    <td>
                      <span
                        className="font-mono text-sm font-bold"
                        style={{ color: "var(--color-primary)" }}
                      >
                        #{c.caseCode}
                      </span>
                    </td>
                    <td>
                      <div>
                        <p className="font-semibold text-sm text-ink">
                          {c.doctor.name}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--color-ink-muted)" }}
                        >
                          {c.patientName}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: "var(--color-canvas)",
                          color: "var(--color-ink)",
                        }}
                      >
                        {c.productType.name}
                      </span>
                    </td>
                    <td className="font-semibold text-ink">
                      {formatCurrency(c.totalAmount)}
                    </td>
                    <td style={{ color: "#34c759", fontWeight: 600 }}>
                      {formatCurrency(c.collected)}
                    </td>
                    <td
                      style={{
                        color: c.remaining > 0 ? "#d97706" : "#34c759",
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(c.remaining)}
                    </td>
                    <td>
                      <span className="badge" style={statusInfo.style}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={{ color: "var(--color-ink-muted)", fontSize: "12px" }}>
                      {formatDate(c.receivedAt)}
                    </td>
                    <td>
                      <Link
                        href={`/cases/${c.id}`}
                        className="btn-icon"
                        title="تفاصيل"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

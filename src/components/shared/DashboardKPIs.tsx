"use client";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BadgeCheck,
  Clock,
  ReceiptText,
  FolderOpen,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface KPIs {
  totalCasesMonth: number;
  completedCasesMonth: number;
  totalSales: number;
  totalCollected: number;
  totalExpenses: number;
  remaining: number;
  netProfit: number;
  pendingCases: number;
}

interface DashboardKPIsProps {
  kpis: KPIs;
  monthName: string;
}

export function DashboardKPIs({ kpis, monthName }: DashboardKPIsProps) {
  const cards = [
    {
      id: "kpi-sales",
      label: "إجمالي المبيعات",
      value: formatCurrency(kpis.totalSales),
      sub: `${kpis.totalCasesMonth} حالة هذا الشهر`,
      icon: FolderOpen,
      iconBg: "rgba(0, 102, 204, 0.08)",
      valueColor: "#0066cc", // Action Blue
    },
    {
      id: "kpi-collected",
      label: "إجمالي التحصيل",
      value: formatCurrency(kpis.totalCollected),
      sub: `متبقي ${formatCurrency(kpis.remaining)}`,
      icon: Wallet,
      iconBg: "rgba(52, 199, 89, 0.12)",
      valueColor: "#34c759", // iOS Success Green
    },
    {
      id: "kpi-expenses",
      label: "إجمالي المصروفات",
      value: formatCurrency(kpis.totalExpenses),
      sub: `شهر ${monthName}`,
      icon: ReceiptText,
      iconBg: "rgba(255, 59, 48, 0.08)",
      valueColor: "#ff3b30", // iOS Red
    },
    {
      id: "kpi-net",
      label: "الصافي",
      value: formatCurrency(kpis.netProfit),
      sub: kpis.netProfit >= 0 ? "ربح ✓" : "خسارة ✗",
      icon: kpis.netProfit >= 0 ? TrendingUp : TrendingDown,
      iconBg: kpis.netProfit >= 0 ? "rgba(52, 199, 89, 0.12)" : "rgba(255, 59, 48, 0.1)",
      valueColor: kpis.netProfit >= 0 ? "#34c759" : "#ff3b30",
    },
    {
      id: "kpi-completed",
      label: "حالات مكتملة",
      value: String(kpis.completedCasesMonth),
      sub: `من ${kpis.totalCasesMonth} إجمالي`,
      icon: BadgeCheck,
      iconBg: "rgba(255, 149, 0, 0.12)",
      valueColor: "#ff9500", // iOS Orange
    },
    {
      id: "kpi-pending",
      label: "قيد التنفيذ",
      value: String(kpis.pendingCases),
      sub: "حالة لم تُسلَّم بعد",
      icon: Clock,
      iconBg: "rgba(29, 29, 31, 0.08)",
      valueColor: "#1d1d1f", // Apple Ink
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.id} id={card.id} className="kpi-card">
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3 shadow-xs"
              style={{ background: card.iconBg }}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: card.valueColor }}
              />
            </div>

            {/* Value */}
            <p
              className="font-display text-xl font-bold leading-none"
              style={{
                color: card.valueColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {card.value}
            </p>

            {/* Label */}
            <p
              className="text-xs font-semibold mt-2 text-ink"
            >
              {card.label}
            </p>

            {/* Sub */}
            <p
              className="text-[11px] mt-1"
              style={{ color: "var(--color-ink-muted)" }}
            >
              {card.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}

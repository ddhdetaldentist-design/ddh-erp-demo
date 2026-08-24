"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentMethodMap } from "@/components/cases/CaseDetailClient";
import {
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowLeft,
  X,
  Users,
  CheckCircle2,
  PieChart,
  Stethoscope,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  date: Date | string;
  category: string;
  employee?: { name: string } | null;
  doctor?: { name: string } | null;
}

interface UncollectedCase {
  id: string;
  caseCode: string;
  patientName: string;
  remaining: number;
  totalAmount: number;
  doctor: { name: string };
  productType: { name: string };
}

interface FinanceData {
  sales: number;
  collected: number;
  courierRemittancesTotal?: number;
  expenses: number;
  remaining: number;
  net: number;
  month: number;
  year: number;
  byMethod: Record<string, number>;
  byCourier: Record<string, { name: string; amount: number; count: number }>;
  byExpenseCategory: Record<string, number>;
  recentExpenses: ExpenseItem[];
  topUncollectedCases: UncollectedCase[];
}

const expenseCategoryMap: Record<string, string> = {
  RENT: "إيجار المعمل",
  SALARY: "مرتبات الموظفين",
  TRANSPORT: "مواصلات وانتقالات",
  SUPPLIES: "مستلزمات وخامات",
  UTILITIES: "مرافق وخدمات (نت/كهرباء)",
  LAB_INVOICE: "فواتير معامل خارجية",
  OTHER: "مصروفات أخرى",
};

export function FinanceClient({ data: initialData }: { data: FinanceData }) {
  const [financeData, setFinanceData] = useState<FinanceData>(initialData);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialData.month);
  const [selectedYear, setSelectedYear] = useState<number>(initialData.year);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleMonthYearChange = async (m: number, y: number) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    setLoading(true);
    try {
      const res = await fetch(`/api/finance?month=${m}&year=${y}`);
      if (res.ok) {
        const body = await res.json();
        if (body.summary) {
          setFinanceData(prev => ({
            ...prev,
            sales: body.summary.totalSales ?? prev.sales,
            collected: body.summary.totalCollected ?? prev.collected,
            expenses: body.summary.totalExpenses ?? prev.expenses,
            net: body.summary.netProfit ?? prev.net,
            month: m,
            year: y,
          }));
        }
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  const data = financeData;

  return (
    <div className="space-y-6">
      {/* Month & Year Filter Header Bar */}
      <div className="filter-bar">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-ink whitespace-nowrap">تحديد الشهر والسنة:</span>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthYearChange(Number(e.target.value), selectedYear)}
              className="input cursor-pointer font-bold text-xs"
              style={{ height: "36px", minWidth: "110px" }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>شهر {m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => handleMonthYearChange(selectedMonth, Number(e.target.value))}
              className="input cursor-pointer font-bold text-xs"
              style={{ height: "36px", minWidth: "90px" }}
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {loading && <span className="text-xs text-primary font-semibold">جارٍ التحديث...</span>}
        </div>

        <span className="text-xs font-medium text-ink-muted">
          إحصائيات شهر <strong className="text-primary font-bold">{selectedMonth}/{selectedYear}</strong>
        </span>
      </div>
      {/* Financial KPIs Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Sales */}
        <div className="kpi-card">
          <span className="text-xs font-semibold text-ink-muted">إجمالي المبيعات</span>
          <p className="font-bold text-xl text-primary">
            {formatCurrency(data.sales)}
          </p>
          <p className="text-xs text-ink-subtle">قيمة الحالات هذا الشهر</p>
        </div>

        {/* Total Case Collected */}
        <div className="kpi-card">
          <span className="text-xs font-semibold text-ink-muted">تحصيل الحالات</span>
          <p className="font-bold text-xl text-emerald-600">
            {formatCurrency(data.collected - (data.courierRemittancesTotal || 0))}
          </p>
          <p className="text-xs text-ink-subtle">مباشرة من الدكاترة</p>
        </div>

        {/* Total Courier Remittances */}
        <div className="kpi-card">
          <span className="text-xs font-semibold text-ink-muted">توريدات المندوبين</span>
          <p className="font-bold text-xl text-blue-600">
            {formatCurrency(data.courierRemittancesTotal || 0)}
          </p>
          <p className="text-xs text-ink-subtle">نقدية مستلمة من المندوبين</p>
        </div>

        {/* Total Expenses */}
        <div className="kpi-card">
          <span className="text-xs font-semibold text-ink-muted">إجمالي المصروفات</span>
          <p className="font-bold text-xl text-red-600">
            {formatCurrency(data.expenses)}
          </p>
          <p className="text-xs text-ink-subtle">مصروفات التشغيل والمرتبات</p>
        </div>

        {/* Net Profit Card (Interactive - Click to open modal) */}
        <div
          onClick={() => setShowBreakdownModal(true)}
          className="card-house cursor-pointer hover:opacity-95 transition-all relative overflow-hidden group"
          title="اضغط لمشاهدة التفاصيل وتوزيع الأرباح والتحصيل"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/80">صافي الربح الفعلي</span>
            <span className="bg-white/20 p-1 px-2 rounded-full text-[11px] text-white font-medium flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> التفاصيل
            </span>
          </div>
          <p className="font-display text-2xl font-black text-white mt-1">
            {formatCurrency(data.net)}
          </p>
          <p className="text-xs mt-1 text-white/70">إجمالي التحصيل - المصروفات</p>
        </div>
      </div>

      {/* Breakdown Summary Cards (By Method & By Courier preview) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Methods Breakdown */}
        <div className="card p-5">
          <h3 className="font-bold text-ink text-sm mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            توزيع التحصيل حسب طريقة الدفع
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(paymentMethodMap).map(([key, val]) => {
              const amount = data.byMethod[key] || 0;
              return (
                <div key={key} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <div className="font-semibold text-slate-700 mb-1">
                    <span>{val.label}</span>
                  </div>
                  <span className="font-bold text-sm text-emerald-600 block">
                    {formatCurrency(amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Couriers Breakdown Preview */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              تحصيلات المندوبين والموصلين
            </h3>
            <Link href="/couriers" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto">
            {Object.values(data.byCourier).length === 0 ? (
              <p className="text-xs text-center py-4 text-ink-subtle">
                لم يتم تسجيل مندوبين مع المدفوعات في هذا الشهر
              </p>
            ) : (
              Object.values(data.byCourier).map((courier) => (
                <div key={courier.name} className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <span className="font-semibold text-ink">المندوب: {courier.name}</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(courier.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Uncollected Cases */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-ink text-base flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-amber-600" />
              أعلى الحالات مديونية ومتبقي
            </h3>
            <Link href="/cases" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              كل الحالات <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {data.topUncollectedCases.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <span className="font-mono text-xs font-bold text-primary">#{c.caseCode}</span>
                  <span className="text-xs font-semibold text-ink mr-2">د. {c.doctor?.name || "—"}</span>
                  <p className="text-[11px] text-ink-muted">
                    {c.patientName} · {c.productType?.name || "—"}
                  </p>
                </div>
                <div className="text-left">
                  <span className="font-bold text-sm text-amber-700">{formatCurrency(c.remaining)}</span>
                  <p className="text-[11px] text-ink-subtle">متبقي من {formatCurrency(c.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Expenses List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-ink text-base flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-red-600" />
              أحدث المصروفات المسجلة
            </h3>
            <Link href="/expenses" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {data.recentExpenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="font-semibold text-xs text-ink">{exp.description}</p>
                  <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                    <span>{new Date(exp.date).toLocaleDateString("ar-EG")}</span>
                    {exp.employee?.name && <span className="text-primary font-medium">· موظف: {exp.employee.name}</span>}
                    {exp.doctor?.name && <span className="text-purple-600 font-medium">· طبيب: {exp.doctor.name}</span>}
                  </div>
                </div>
                <span className="font-bold text-sm text-red-600">{formatCurrency(exp.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NET PROFIT FULL BREAKDOWN MODAL */}
      {showBreakdownModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowBreakdownModal(false)}>
          <div className="modal-sheet max-w-2xl animate-fadeIn">

            {/* Header */}
            <div className="modal-header">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-ink">تفاصيل وحساب صافي الربح الفعلي</h3>
                  <span className="badge bg-primary text-white">شهر {data.month}/{data.year}</span>
                </div>
                <p className="text-xs text-ink-muted">توزيع مبالغ التحصيل والمدفوعات والمصروفات</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakdownModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">

              {/* Formula Summary */}
              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5">
                <p className="text-[11px] font-semibold text-primary mb-1">معادلة الربح: (تحصيل الحالات + توريدات المندوبين) - المصروفات</p>
                <div className="flex items-end justify-between flex-wrap gap-3 mt-2">
                  <p className="text-sm font-bold text-ink">
                    ({formatCurrency(data.collected - (data.courierRemittancesTotal || 0))} + {formatCurrency(data.courierRemittancesTotal || 0)}) − {formatCurrency(data.expenses)}
                  </p>
                  <div className="text-left">
                    <span className="text-[11px] text-ink-muted block">صافي الربح</span>
                    <span className="font-black text-xl text-primary">{formatCurrency(data.net)}</span>
                  </div>
                </div>
              </div>

              {/* 1. Payment Methods */}
              <div className="space-y-3">
                <h4 className="section-title">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  ١. توزيع التحصيل حسب طريقة الدفع
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(paymentMethodMap).map(([key, val]) => {
                    const amount = data.byMethod[key] || 0;
                    return (
                      <div key={key} className="inner-card">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted mb-2">
                          <span>{val.label}</span>
                        </span>
                        <span className="font-extrabold text-base text-emerald-600">{formatCurrency(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Couriers */}
              <div className="space-y-3">
                <h4 className="section-title">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  ٢. توريدات وتحصيلات المندوبين
                </h4>
                {Object.values(data.byCourier).length === 0 ? (
                  <p className="text-xs text-ink-subtle inner-card text-center">
                    لا توجد تحصيلات مرتبطة بمندوبين في هذا الشهر
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.values(data.byCourier).map((c) => (
                      <div key={c.name} className="inner-card flex items-center justify-between">
                        <span className="font-semibold text-sm text-ink">المندوب: {c.name}</span>
                        <span className="font-extrabold text-sm text-emerald-600">{formatCurrency(c.amount)} ({c.count} عملية)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Expenses */}
              <div className="space-y-3">
                <h4 className="section-title">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  ٣. توزيع المصروفات حسب التصنيف
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(expenseCategoryMap).map(([key, label]) => {
                    const amount = data.byExpenseCategory[key] || 0;
                    if (amount === 0) return null;
                    return (
                      <div key={key} className="rounded-xl bg-red-50 border border-red-100 p-4">
                        <span className="text-xs font-semibold text-ink-muted block mb-2">{label}</span>
                        <span className="font-extrabold text-base text-red-600">{formatCurrency(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowBreakdownModal(false)}
                className="btn btn-primary btn-sm px-6 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




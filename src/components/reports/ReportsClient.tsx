"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadReportPDF } from "./ReportPDF";
import { downloadDoctorInvoicePDF } from "./DoctorInvoicePDF";
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  Stethoscope,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileDown,
} from "lucide-react";


interface Doctor {
  id: string;
  name: string;
  clinicName: string | null;
  area: string | null;
}

interface CaseItem {
  id: string;
  caseCode: string;
  patientName: string;
  totalAmount: number;
  collected: number;
  remaining: number;
  status: string;
  receivedAt: Date;
  deliveryDate: Date | null;
  doctorId: string;
  units: number;
  pricePerUnit: number;
  color: string | null;
  doctor: { name: string };
  productType: { name: string };
}

interface Expense {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
  month: number;
  year: number;
}

interface ReportsClientProps {
  doctors: Doctor[];
  allCases: CaseItem[];
  allExpenses: Expense[];
}

export function ReportsClient({ doctors, allCases, allExpenses }: ReportsClientProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Filter Cases by selected Month, Year, and Doctor
  const filteredCases = allCases.filter((c) => {
    const date = new Date(c.receivedAt);
    const matchMonth = selectedMonth === 0 || date.getMonth() + 1 === selectedMonth;
    const matchYear = date.getFullYear() === selectedYear;
    const matchDoctor = !selectedDoctorId || c.doctorId === selectedDoctorId;
    return matchMonth && matchYear && matchDoctor;
  });

  // Filter Expenses by selected Month & Year
  const filteredExpenses = allExpenses.filter((e) => {
    const matchMonth = selectedMonth === 0 || e.month === selectedMonth;
    const matchYear = e.year === selectedYear;
    return matchMonth && matchYear;
  });

  // Calculated totals
  const totalSales = filteredCases.reduce((s, c) => s + c.totalAmount, 0);
  const totalCollected = filteredCases.reduce((s, c) => s + c.collected, 0);
  const totalRemaining = filteredCases.reduce((s, c) => s + c.remaining, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalCollected - totalExpenses;

  const selectedDoctorObj = doctors.find((d) => d.id === selectedDoctorId);

  // Build shared PDF props
  const pdfProps = {
    cases: filteredCases,
    expenses: filteredExpenses,
    month: selectedMonth,
    year: selectedYear,
    totalSales,
    totalCollected,
    totalRemaining,
    totalExpenses,
    netProfit,
  };

  // Download Monthly Report as Professional PDF
  const downloadMonthlyPDF = async () => {
    setGeneratingPDF(true);
    try {
      await downloadReportPDF(pdfProps);
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Download Doctor Invoice PDF (the professional statement matching the screenshot)
  const downloadInvoicePDF = async () => {
    if (!selectedDoctorObj) return;
    setGeneratingPDF(true);
    try {
      await downloadDoctorInvoicePDF({
        doctorName: selectedDoctorObj.name,
        clinicName: selectedDoctorObj.clinicName,
        area: selectedDoctorObj.area,
        cases: filteredCases.filter(Boolean).map((c) => ({
          id: c.id || "",
          patientName: c.patientName || "-",
          totalAmount: c.totalAmount || 0,
          units: c.units || 1,
          pricePerUnit: c.pricePerUnit || 0,
          color: c.color || null,
          productType: c.productType || { name: "-" },
        })),
        month: selectedMonth,
        year: selectedYear,
        totalRemaining,
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Download Doctor Statement as Professional PDF
  const downloadDoctorPDF = async () => {
    if (!selectedDoctorObj) return;
    setGeneratingPDF(true);
    try {
      await downloadReportPDF({ ...pdfProps, doctorName: selectedDoctorObj.name });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Export Monthly Report to Excel
  const exportMonthlyExcel = async () => {
    const XLSX = await import("xlsx");
    const dataToExport = filteredCases.map((c) => ({
      "كود الحالة": c.caseCode,
      "تاريخ الاستلام": formatDate(c.receivedAt),
      "الدكتور": c.doctor.name,
      "اسم المريض": c.patientName,
      "نوع التركيبة": c.productType.name,
      "الإجمالي (جم)": c.totalAmount,
      "المدفوع (جم)": c.collected,
      "المتبقي (جم)": c.remaining,
      "الحالة": c.status,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `تقرير_شهر_${selectedMonth || "الكل"}_${selectedYear}`);
    XLSX.writeFile(wb, `DDH_Report_Month_${selectedMonth}_${selectedYear}.xlsx`);
  };

  // Export Doctor Statement to Excel
  const exportDoctorStatementExcel = async () => {
    if (!selectedDoctorObj) return;
    const XLSX = await import("xlsx");
    const dataToExport = filteredCases.map((c) => ({
      "كود الحالة": c.caseCode,
      "تاريخ الاستلام": formatDate(c.receivedAt),
      "اسم المريض": c.patientName,
      "نوع التركيبة": c.productType.name,
      "الإجمالي (جم)": c.totalAmount,
      "المدفوع (جم)": c.collected,
      "المتبقي (جم)": c.remaining,
      "الحالة": c.status,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `كشف_حساب_د_${selectedDoctorObj.name}`);
    XLSX.writeFile(wb, `DDH_Statement_Dr_${selectedDoctorObj.name}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="filter-bar">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div>
            <label className="label">اختيار الشهر</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input cursor-pointer font-bold text-xs"
              style={{ minWidth: "130px", height: "38px" }}
            >
              <option value={0}>كل الشهور</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  شهر {m}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="label">السنة</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input cursor-pointer font-bold text-xs"
              style={{ minWidth: "100px", height: "38px" }}
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Filter (كشف حساب الدكتور) */}
          <div>
            <label className="label">كشف حساب طبيب معين</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="input cursor-pointer font-bold text-xs"
              style={{ minWidth: "200px", height: "38px" }}
            >
              <option value="">كل الأطباء</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  د. {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Export Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadMonthlyPDF}
            disabled={generatingPDF}
            className="btn btn-primary btn-sm"
          >
            {generatingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            تحميل PDF
          </button>
          {/* <button onClick={exportMonthlyExcel} className="btn btn-outlined btn-sm">
            <FileSpreadsheet className="w-4 h-4" />
            تصدير إكسل
          </button> */}
        </div>
      </div>

      {/* Summary Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="kpi-card">
          <span className="text-xs font-semibold text-ink-muted">إجمالي المبيعات</span>
          <p className="font-bold text-xl text-primary">
            {formatCurrency(totalSales)}
          </p>
          <p className="text-xs text-ink-subtle">{filteredCases.length} حالة مسجلة</p>
        </div>
        <div className="kpi-card">
          <span className="text-xs font-semibold text-ink-muted">إجمالي التحصيل</span>
          <p className="font-bold text-xl text-emerald-600">
            {formatCurrency(totalCollected)}
          </p>
          <p className="text-xs text-ink-subtle">المدفوعات المستلمة</p>
        </div>
        <div className="kpi-card">
          <span className="text-xs font-semibold text-ink-muted">المتبقي والمديونيات</span>
          <p className="font-bold text-xl text-amber-600">
            {formatCurrency(totalRemaining)}
          </p>
          <p className="text-xs text-ink-subtle">متبقي غير محصل</p>
        </div>
        <div className="card-house">
          <span className="text-xs font-semibold text-white/80">صافي الربح الفعلي</span>
          <p className="font-bold text-2xl text-white mt-1">
            {formatCurrency(netProfit)}
          </p>
          <p className="text-xs text-white/70 mt-1">بعد خصم المصروفات ({formatCurrency(totalExpenses)})</p>
        </div>
      </div>

      {/* Doctor Account Statement View (If doctor selected) */}
      {selectedDoctorObj && (
        <div className="card bg-amber-50/50 border-amber-200/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-ink text-base">كشف حساب تفصيلي: د. {selectedDoctorObj.name}</h3>
                <p className="text-xs text-ink-muted">
                  {selectedDoctorObj.clinicName || "عيادة"} {selectedDoctorObj.area ? `(${selectedDoctorObj.area})` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadInvoicePDF}
                disabled={generatingPDF}
                className="btn btn-primary btn-sm"
              >
                {generatingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                تحميل كشف الحساب PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report / Cases Table */}
      <div className="card p-0 overflow-hidden print:shadow-none print:border-none">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-ink text-base">
            بيانات التقرير الحالية ({filteredCases.length} حالة)
          </h3>
          <span className="text-xs text-ink-muted">
            شهر {selectedMonth || "الكل"} / سنة {selectedYear}
          </span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>كود الحالة</th>
                <th>التاريخ</th>
                <th>الدكتور</th>
                <th>المريض</th>
                <th>التركيبة</th>
                <th>الإجمالي</th>
                <th>التحصيل</th>
                <th>المتبقي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-ink-muted">
                    لا توجد حالات مسجلة لهذه الفلترة
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono font-bold text-primary">#{c.caseCode}</td>
                    <td className="text-xs text-ink-muted">{formatDate(c.receivedAt)}</td>
                    <td className="font-semibold text-ink">{c.doctor.name}</td>
                    <td className="text-ink-muted">{c.patientName}</td>
                    <td>
                      <span className="badge" style={{ background: "var(--color-canvas)", color: "var(--color-ink)" }}>
                        {c.productType.name}
                      </span>
                    </td>
                    <td className="font-semibold text-ink">{formatCurrency(c.totalAmount)}</td>
                    <td style={{ color: "#34c759", fontWeight: 600 }}>{formatCurrency(c.collected)}</td>
                    <td style={{ color: c.remaining > 0 ? "#d97706" : "#34c759", fontWeight: 600 }}>
                      {formatCurrency(c.remaining)}
                    </td>
                    <td>
                      <span className="badge" style={{ background: "rgba(0, 102, 204, 0.08)", color: "#0066cc" }}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

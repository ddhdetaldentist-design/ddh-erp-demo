"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentMethodMap } from "@/components/cases/CaseDetailClient";
import {
  Users,
  Plus,
  Trash2,
  Printer,
  FileSpreadsheet,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowDownLeft,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";


import { useSession } from "next-auth/react";

interface Remittance {
  id: string;
  amount: number;
  paymentMethod: string;
  date: Date | string;
  notes: string | null;
  employeeId: string;
}

interface CourierData {
  id: string;
  name: string;
  jobTitle: string;
  phone: string | null;
  totalCollected: number;
  count: number;
  byMethod: Record<string, number>;
  remittances: Remittance[];
}

interface CouriersClientProps {
  initialCouriers: CourierData[];
}

export function CouriersClient({ initialCouriers }: CouriersClientProps) {
  const { data: session } = useSession();
  const perms = session?.user?.permissions;
  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canManageCouriers = isSuperOrAdmin || Boolean(perms?.canManageCouriers);
  const canDeleteCouriers = isSuperOrAdmin || Boolean(perms?.canDeleteCouriers);

  const [couriers, setCouriers] = useState<CourierData[]>(initialCouriers);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [expandedCourierId, setExpandedCourierId] = useState<string | null>(null);

  // Add Remittance Modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    amount: "",
    paymentMethod: "CASH",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Edit Remittance state
  const [editingRemittance, setEditingRemittance] = useState<Remittance | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", paymentMethod: "CASH", notes: "", date: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditRemittance = (r: Remittance) => {
    setEditingRemittance(r);
    setEditForm({
      amount: String(r.amount),
      paymentMethod: r.paymentMethod || "CASH",
      notes: r.notes || "",
      date: new Date(r.date).toISOString().split("T")[0],
    });
  };

  const handleEditRemittance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRemittance) return;
    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("أدخل مبلغاً صحيحاً");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/couriers/remittances?id=${editingRemittance.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paymentMethod: editForm.paymentMethod, notes: editForm.notes, date: editForm.date }),
      });
      if (!res.ok) throw new Error();
      toast.success("تم تعديل التوريد بنجاح ✓");
      setEditingRemittance(null);
      fetchFilteredData(selectedMonth, selectedYear);
    } catch {
      toast.error("فشل تعديل التوريد");
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchFilteredData = async (month: number, year: number) => {
    try {
      const res = await fetch(`/api/couriers?month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setCouriers(data);
      }
    } catch {
      //
    }
  };

  const handleMonthChange = (m: number) => {
    setSelectedMonth(m);
    fetchFilteredData(m, selectedYear);
  };

  const handleYearChange = (y: number) => {
    setSelectedYear(y);
    fetchFilteredData(selectedMonth, y);
  };

  // Handle Add Remittance
  const handleAddRemittance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.amount) {
      toast.error("اختر المندوب وأدخل المبلغ");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/couriers/remittances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errData = await res.json();
        toast.error(errData.error || "فشل تسجيل التوريد");
        return;
      }

      toast.success("تم تسجيل توريد المندوب بنجاح ✓");
      setShowModal(false);
      setForm({
        employeeId: "",
        amount: "",
        paymentMethod: "CASH",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchFilteredData(selectedMonth, selectedYear);
    } catch {
      toast.error("حدث خطأ في التسجيل");
    } finally {
      setSaving(false);
    }
  };

  // Delete Remittance
  const handleDeleteRemittance = async (id: string) => {
    if (!canDeleteCouriers) {
      toast.error("عذراً، ليس لديك صلاحية حذف التوريدات");
      return;
    }

    if (!confirm("هل أنت تأكد من حذف هذا التوريد؟")) return;

    try {
      const res = await fetch(`/api/couriers/remittances?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();
      toast.success("تم حذف التوريد بنجاح ✓");
      fetchFilteredData(selectedMonth, selectedYear);
    } catch {
      toast.error("فشل حذف التوريد");
    }
  };

  // Grand totals across all couriers
  const grandTotalCollected = couriers.reduce((s, c) => s + c.totalCollected, 0);
  const grandTotalByMethod = couriers.reduce(
    (acc, c) => {
      acc.CASH = (acc.CASH || 0) + (c.byMethod.CASH || 0);
      acc.INSTAPAY = (acc.INSTAPAY || 0) + (c.byMethod.INSTAPAY || 0);
      acc.VODAFONE_CASH = (acc.VODAFONE_CASH || 0) + (c.byMethod.VODAFONE_CASH || 0);
      acc.OTHER = (acc.OTHER || 0) + (c.byMethod.OTHER || 0);
      return acc;
    },
    { CASH: 0, INSTAPAY: 0, VODAFONE_CASH: 0, OTHER: 0 }
  );

  const filteredCouriers = couriers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.jobTitle.toLowerCase().includes(search.toLowerCase())
  );

  // Export to Excel
  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    const rows: Record<string, unknown>[] = [];
    couriers.forEach((c) => {
      c.remittances.forEach((r) => {
        const pm = paymentMethodMap[r.paymentMethod || "CASH"] || paymentMethodMap["CASH"];
        rows.push({
          "اسم المندوب": c.name,
          "وظيفة المندوب": c.jobTitle,
          "المبلغ المحول / التوريد (جم)": r.amount,
          "طريقة التوريد": pm.label,
          "تاريخ التوريد": formatDate(r.date),
          "ملاحظات": r.notes || "—",
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `توريدات_المندوبين_${selectedMonth}_${selectedYear}`);
    XLSX.writeFile(wb, `DDH_Couriers_Remittances_${selectedMonth}_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="card bg-white p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div>
            <label className="label">اختيار الشهر</label>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="input cursor-pointer font-bold text-sm"
              style={{ minWidth: "150px" }}
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
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="input cursor-pointer font-bold text-sm"
              style={{ minWidth: "120px" }}
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Search Courier */}
          <div>
            <label className="label">بحث باسم المندوب</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                type="search"
                placeholder="اسم المندوب..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pr-9 text-sm"
                style={{ width: "200px" }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canManageCouriers && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm gap-1.5">
              <Plus className="w-4 h-4" />
              تسجيل توريد من مندوب
            </button>
          )}
          <button onClick={() => window.print()} className="btn btn-outlined btn-sm">
            <Printer className="w-4 h-4" />
            طباعة الكشف
          </button>
          <button onClick={exportToExcel} className="btn btn-ghost btn-sm">
            <FileSpreadsheet className="w-4 h-4" />
            تصدير إكسل
          </button>
        </div>
      </div>

      {/* Summary KPI Cards per Payment Method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total (blue) */}
        <div className="card-house">
          <span className="text-xs font-semibold text-white/80 leading-tight">إجمالي التوريد من المندوبين</span>
          <p className="font-bold text-2xl text-white mt-1">{formatCurrency(grandTotalCollected)}</p>
          <p className="text-[11px] text-white/60 mt-0.5">توريدات هذا الشهر</p>
        </div>

        {/* Cash */}
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-muted">
            <span>كاش</span>
          </div>
          <p className="font-bold text-xl text-emerald-600">{formatCurrency(grandTotalByMethod.CASH || 0)}</p>
          <span className="text-[11px] text-ink-subtle">سلموها نقداً</span>
        </div>

        {/* InstaPay */}
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-muted">
            <span>إنستا باي</span>
          </div>
          <p className="font-bold text-xl text-indigo-600">{formatCurrency(grandTotalByMethod.INSTAPAY || 0)}</p>
          <span className="text-[11px] text-ink-subtle">تحويل InstaPay</span>
        </div>

        {/* Vodafone + Other */}
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-muted">
            <span>فودافون / أخرى</span>
          </div>
          <p className="font-bold text-xl text-amber-600">{formatCurrency((grandTotalByMethod.VODAFONE_CASH || 0) + (grandTotalByMethod.OTHER || 0))}</p>
          <span className="text-[11px] text-ink-subtle">محافظ إلكترونية</span>
        </div>
      </div>

      {/* Couriers List Cards */}
      <div className="space-y-3">
        {filteredCouriers.map((courier) => {
          const isExpanded = expandedCourierId === courier.id;

          return (
            <div key={courier.id} className="card">

              {/* ── Top: Avatar + Info + Actions ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">

                {/* Avatar + Name */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
                    style={{ background: "var(--color-primary)" }}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-sm leading-snug">{courier.name}</h3>
                    <p className="text-xs text-primary font-medium mt-0.5">
                      {courier.jobTitle}{courier.phone ? ` · ${courier.phone}` : ""}
                    </p>
                  </div>
                </div>

                {/* Total + Buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-left bg-emerald-50 rounded-xl px-4 py-2 border border-emerald-100">
                    <span className="text-[11px] text-ink-muted block font-medium">إجمالي التوريدات</span>
                    <span className="font-bold text-lg text-emerald-600">{formatCurrency(courier.totalCollected)}</span>
                    <span className="text-[11px] text-ink-subtle block">{courier.count} توريد</span>
                  </div>

                  {canManageCouriers && (
                    <button
                      onClick={() => {
                        setForm(f => ({ ...f, employeeId: courier.id }));
                        setShowModal(true);
                      }}
                      className="btn btn-primary btn-sm gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      تسجيل توريد
                    </button>
                  )}

                  <button
                    onClick={() => setExpandedCourierId(isExpanded ? null : courier.id)}
                    className="btn btn-outlined btn-sm flex items-center gap-1"
                  >
                    <span>{isExpanded ? "إخفاء السجل" : "عرض السجل"}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* ── Payment Methods Pills ── */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-muted font-semibold shrink-0">توزيع التوريد:</span>
                {Object.entries(paymentMethodMap).map(([key, val]) => {
                  const amount = courier.byMethod[key] || 0;
                  if (amount === 0) return null;
                  return (
                    <span
                      key={key}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 border border-gray-200 text-slate-700 flex items-center gap-1.5"
                    >
                      <span>{val.label}:</span>
                      <span className="text-primary">{formatCurrency(amount)}</span>
                    </span>
                  );
                })}
                {courier.totalCollected === 0 && (
                  <span className="text-xs text-ink-subtle italic">لم يتم تسجيل أي توريدات لهذا الشهر</span>
                )}
              </div>

              {/* ── Expanded Remittances Table ── */}
              {isExpanded && (
                <div className="animate-fadeIn border-t border-gray-100 pt-4">
                  <h4 className="section-title mb-3">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    سجل التوريدات المستلمة من {courier.name}
                  </h4>

                  {courier.remittances.length === 0 ? (
                    <p className="text-xs text-center py-6 text-ink-subtle">
                      لا توجد توريدات مسجلة لهذا المندوب في هذا الشهر
                    </p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>المبلغ المستلَم</th>
                            <th>طريقة التوريد</th>
                            <th>التاريخ</th>
                            <th>ملاحظات</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {courier.remittances.map((r) => {
                            const pm = paymentMethodMap[r.paymentMethod || "CASH"] || paymentMethodMap["CASH"];
                            return (
                              <tr key={r.id}>
                                <td className="font-bold text-emerald-600">{formatCurrency(r.amount)}</td>
                                <td>
                                  <span className="badge bg-gray-100 text-slate-700">
                                    <span>{pm.label}</span>
                                  </span>
                                </td>
                                <td className="text-xs text-ink-muted">{formatDate(r.date)}</td>
                                <td className="text-xs text-ink-subtle">{r.notes || "—"}</td>
                                <td>
                                  <div className="flex items-center gap-1">
                                    {canManageCouriers && (
                                      <button
                                        onClick={() => openEditRemittance(r)}
                                        className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"
                                        title="تعديل التوريد"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {canDeleteCouriers && (
                                      <button
                                        onClick={() => handleDeleteRemittance(r.id)}
                                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                        title="حذف التوريد"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RECORD REMITTANCE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-sheet max-w-lg animate-fadeIn">
            {/* Header */}
            <div className="modal-header">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                تسجيل توريد نقدية من مندوب
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-gray-100 transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddRemittance} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-4">
                <div>
                  <label className="label">اختر المندوب / المحصل *</label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                    className="input cursor-pointer text-sm font-semibold"
                    required
                  >
                    <option value="">اختر المندوب...</option>
                    {couriers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.jobTitle})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">المبلغ المحول / المستلَم (جم) *</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    className="input font-bold text-emerald-600 text-base"
                    placeholder="مثال: 3500"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">طريقة التوريد / تحويل النقدية *</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                    className="input cursor-pointer text-sm font-semibold"
                  >
                    {Object.entries(paymentMethodMap).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">تاريخ الاستلام / التوريد *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">ملاحظات / رقم المعاملة أو الإيصال</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: تحصيل ميداني منطقة الجيزة / رقم العملية في إنستاباي"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-ghost btn-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary btn-sm px-6 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التوريد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT REMITTANCE MODAL */}
      {editingRemittance && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditingRemittance(null)}>
          <div className="modal-sheet max-w-lg animate-fadeIn">
            <div className="modal-header">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-500" />
                تعديل بيانات التوريد
              </h3>
              <button
                type="button"
                onClick={() => setEditingRemittance(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-gray-100 transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditRemittance} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-4">
                <div>
                  <label className="label">المبلغ المحول / المستلَم (جم) *</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    className="input font-bold text-emerald-600 text-base"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">طريقة التوريد *</label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                    className="input cursor-pointer text-sm font-semibold"
                  >
                    {Object.entries(paymentMethodMap).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">تاريخ التوريد *</label>
                  <input
                    type="date"
                    className="input"
                    value={editForm.date}
                    onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">ملاحظات</label>
                  <input
                    type="text"
                    className="input"
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setEditingRemittance(null)} className="btn btn-ghost btn-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={savingEdit} className="btn btn-primary btn-sm px-6">
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Loader2, Receipt, CalendarDays, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, expenseCategoryMap } from "@/lib/utils";

interface Employee { id: string; name: string }
interface Doctor   { id: string; name: string }

interface Expense {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
  paymentMethod?: string;
  employee?: { id: string; name: string } | null;
  doctor?: { id: string; name: string } | null;
  notes?: string | null;
}

const paymentMethodLabels: Record<string, string> = {
  CASH: "كاش (نقدي)",
  INSTAPAY: "إنستا باي",
  BANK_TRANSFER: "تحويل بنكي",
  VODAFONE_CASH: "فودافون كاش",
  OTHER: "طريقة أخرى",
};

interface ExpensesClientProps {
  initialExpenses: Expense[];
  employees: Employee[];
  doctors?: Doctor[];
  month: number;
  year: number;
}

const CATEGORIES = [
  { value: "RENT",        label: "إيجار" },
  { value: "SALARY",      label: "مرتب" },
  { value: "TRANSPORT",   label: "مواصلات" },
  { value: "SUPPLIES",    label: "مستلزمات" },
  { value: "UTILITIES",   label: "مرافق" },
  { value: "LAB_INVOICE", label: "فاتورة معمل" },
  { value: "OTHER",       label: "أخرى" },
];

export function ExpensesClient({ initialExpenses, employees, doctors = [], month, year }: ExpensesClientProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canManageExpenses = isSuperOrAdmin || Boolean(session?.user?.permissions?.canManageExpenses);
  const canDeleteExpenses = isSuperOrAdmin || Boolean(session?.user?.permissions?.canDeleteExpenses);

  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");

  const [form, setForm] = useState({
    date:        new Date().toISOString().split("T")[0],
    description: "",
    amount:      "",
    category:    "OTHER",
    paymentMethod: "CASH",
    employeeId:  "",
    doctorId:    "",
    notes:       "",
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat = !categoryFilter || e.category === categoryFilter;
      const matchEmp = !employeeFilter || e.employee?.id === employeeFilter;
      const matchDoc = !doctorFilter || e.doctor?.id === doctorFilter;
      return matchCat && matchEmp && matchDoc;
    });
  }, [expenses, categoryFilter, employeeFilter, doctorFilter]);

  const totalFiltered = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const handleDeleteExpense = async (id: string) => {
    if (!canDeleteExpenses) {
      toast.error("عذراً، ليس لديك صلاحية حذف المصروفات");
      return;
    }

    if (!confirm("هل أنت تأكد من حذف هذا المصروف؟")) return;

    try {
      const res = await fetch(`/api/finance/expenses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");

      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success("تم حذف المصروف بنجاح ✓");
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "حدث خطأ أثناء الحذف");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageExpenses) {
      toast.error("عذراً، ليس لديك صلاحية إضافة مصروفات");
      return;
    }

    if (!form.description || !form.amount) {
      toast.error("أدخل الوصف والمبلغ");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount:     parseFloat(form.amount),
          employeeId: form.employeeId || null,
          doctorId:   form.doctorId || null,
          month,
          year,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error ?? "فشل الحفظ");
        return;
      }

      const newExpense = await res.json();
      setExpenses(prev => [...prev, newExpense]);
      setForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        category: "OTHER",
        paymentMethod: "CASH",
        employeeId: "",
        doctorId: "",
        notes: "",
      });
      setShowForm(false);
      toast.success("تم إضافة المصروف ✓");
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  const categoryTotals = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-house">
          <p className="text-xs text-white/70 font-medium">إجمالي المصروفات</p>
          <p className="font-bold text-2xl text-white mt-1">
            {formatCurrency(totalFiltered)}
          </p>
          <p className="text-[11px] text-white/60 mt-1">{filteredExpenses.length} بند</p>
        </div>
        {categoryTotals.slice(0, 3).map(cat => (
          <div key={cat.value} className="kpi-card">
            <p className="text-xs font-semibold text-ink-muted">
              {cat.label}
            </p>
            <p className="font-bold text-lg text-red-600 mt-1">{formatCurrency(cat.total)}</p>
          </div>
        ))}
      </div>

      {/* Add Button and Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-ink text-lg">قائمة المصروفات</h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Filter */}
          <div className="relative">
            <select
              value={month}
              onChange={(e) => router.push(`/expenses?month=${e.target.value}&year=${year}`)}
              className="input cursor-pointer font-bold text-xs py-1.5 px-3"
              style={{ minWidth: "110px" }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>شهر {m}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="relative">
            <select
              value={year}
              onChange={(e) => router.push(`/expenses?month=${month}&year=${e.target.value}`)}
              className="input cursor-pointer font-bold text-xs py-1.5 px-3"
              style={{ minWidth: "90px" }}
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input cursor-pointer font-semibold text-xs py-1.5 px-3"
              style={{ minWidth: "130px" }}
            >
              <option value="">كل التصنيفات</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div className="relative">
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="input cursor-pointer font-semibold text-xs py-1.5 px-3"
              style={{ minWidth: "130px" }}
            >
              <option value="">كل الموظفين</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {/* Doctor Filter */}
          <div className="relative">
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="input cursor-pointer font-semibold text-xs py-1.5 px-3"
              style={{ minWidth: "130px" }}
            >
              <option value="">كل الأطباء</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>د. {doc.name}</option>
              ))}
            </select>
          </div>

          {canManageExpenses && (
            <button
              id="add-expense"
              onClick={() => setShowForm(!showForm)}
              className="btn btn-primary btn-sm"
            >
              <Plus className="w-4 h-4" />
              {showForm ? "إلغاء" : "إضافة مصروف"}
            </button>
          )}
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card border-primary/20 bg-blue-50/20">
          <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            تسجيل مصروف جديد
          </h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">التاريخ *</label>
              <input type="date" className="input" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">التصنيف *</label>
              <select className="input cursor-pointer" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">المبلغ (جم) *</label>
              <input type="number" min="0" className="input font-bold text-red-600" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="مثال: 500" />
            </div>
            <div>
              <label className="label">الموظف المرتبط (اختياري)</label>
              <select className="input cursor-pointer" value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
                <option value="">— لا يوجد موظف —</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">الدكتور المرتبط (اختياري)</label>
              <select className="input cursor-pointer" value={form.doctorId}
                onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}>
                <option value="">— لا يوجد دكتور —</option>
                {doctors.map(doc => <option key={doc.id} value={doc.id}>د. {doc.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">طريقة الخصم/الدفع *</label>
              <select className="input cursor-pointer font-semibold text-slate-700" value={form.paymentMethod}
                onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="CASH">كاش (نقدي)</option>
                <option value="INSTAPAY">إنستا باي (Instapay)</option>
                <option value="BANK_TRANSFER">تحويل بنكي</option>
                <option value="VODAFONE_CASH">فودافون كاش</option>
                <option value="OTHER">طريقة أخرى</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="label">الوصف التفصيلي *</label>
              <input className="input" placeholder="مثال: إيجار المعمل / خامات سيراميك / حساب دكتور" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">إلغاء</button>
              <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                حفظ المصروف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th><CalendarDays className="w-3.5 h-3.5 inline ml-1" />التاريخ</th>
                <th>الوصف</th>
                <th>التصنيف</th>
                <th>طريقة الدفع</th>
                <th>الموظف المرتبط</th>
                <th>الدكتور المرتبط</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10" style={{ color: "var(--color-ink-muted)" }}>
                    لا توجد مصروفات مطابقة للفلترة المسجلة
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr key={exp.id}>
                    <td style={{ color: "var(--color-ink-muted)", fontSize: "0.85rem" }}>
                      {formatDate(exp.date)}
                    </td>
                    <td className="font-semibold text-ink">{exp.description}</td>
                    <td>
                      <span className="badge" style={{ background: "var(--color-canvas)", color: "var(--color-ink)" }}>
                        {expenseCategoryMap[exp.category]?.label ?? exp.category}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-gray-100 text-slate-700 font-semibold text-[11px]">
                        {paymentMethodLabels[exp.paymentMethod || "CASH"] || exp.paymentMethod}
                      </span>
                    </td>
                    <td style={{ color: "var(--color-ink-muted)" }}>
                      {exp.employee?.name ? <span className="font-medium text-primary">{exp.employee.name}</span> : "—"}
                    </td>
                    <td style={{ color: "var(--color-ink-muted)" }}>
                      {exp.doctor?.name ? <span className="font-medium text-purple-600">د. {exp.doctor.name}</span> : "—"}
                    </td>
                    <td className="font-bold text-red-600">
                      {formatCurrency(exp.amount)}
                    </td>
                    {canDeleteExpenses && (
                      <td className="text-center">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="btn-icon hover:!bg-red-50 text-red-500"
                          title="حذف المصروف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={6} className="font-bold text-ink py-3 px-4">إجمالي المصروفات المفلترة</td>
                  <td className="font-black text-xl py-3 px-4 text-red-600">
                    {formatCurrency(totalFiltered)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

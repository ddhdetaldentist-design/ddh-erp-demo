"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Users, Plus, Phone, Edit, Trash2, Loader2, Save, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Employee {
  id: string;
  name: string;
  jobTitle: string | null;
  phone: string | null;
  baseSalary: number | null;
  isActive: boolean;
  _count?: { expenses: number };
}

export function EmployeesClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  const perms = session?.user?.permissions;
  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canManageEmployees = isSuperOrAdmin || Boolean(perms?.canManageEmployees);
  const canDeleteEmployees = isSuperOrAdmin || Boolean(perms?.canDeleteEmployees);

  const [form, setForm] = useState({
    name: "",
    jobTitle: "",
    phone: "",
    baseSalary: "",
  });

  const openAddModal = () => {
    if (!canManageEmployees) {
      toast.error("عذراً، ليس لديك صلاحية إضافة موظفين جدد");
      return;
    }
    setEditingEmp(null);
    setForm({ name: "", jobTitle: "", phone: "", baseSalary: "" });
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    if (!canManageEmployees) {
      toast.error("عذراً، ليس لديك صلاحية تعديل بيانات الموظفين");
      return;
    }
    setEditingEmp(emp);
    setForm({
      name: emp.name,
      jobTitle: emp.jobTitle || "",
      phone: emp.phone || "",
      baseSalary: emp.baseSalary ? String(emp.baseSalary) : "",
    });
    setShowModal(true);
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!canDeleteEmployees) {
      toast.error("عذراً، ليس لديك صلاحية حذف الموظفين");
      return;
    }

    if (!confirm(`هل أنت تأكد من حذف الموظف (${name})؟`)) return;

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });

      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "فشل حذف الموظف");
        return;
      }

      setEmployees(prev => prev.filter(e => e.id !== id));
      toast.success("تم حذف الموظف بنجاح ✓");
      router.refresh();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEmployees) return;

    if (!form.name) {
      toast.error("أدخل اسم الموظف");
      return;
    }

    setSaving(true);
    try {
      const url = editingEmp ? `/api/employees/${editingEmp.id}` : "/api/employees";
      const method = editingEmp ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          baseSalary: form.baseSalary ? parseFloat(form.baseSalary) : 0,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "حدث خطأ في الحفظ");

      toast.success(editingEmp ? "تم تعديل الموظف بنجاح ✓" : "تم إضافة الموظف بنجاح ✓");
      setShowModal(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "حدث خطأ في عملية الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-ink text-lg">فريق العمل والموظفون</h2>
          <p className="text-xs text-ink-muted">
            إجمالي {employees.length} موظف وفني في المعمل
          </p>
        </div>
        {canManageEmployees && (
          <button onClick={openAddModal} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            إضافة موظف
          </button>
        )}
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div key={emp.id} className="card">

            {/* Top: Avatar + Name + Actions */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
                  style={{ background: "var(--color-primary)" }}
                >
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-sm leading-snug">{emp.name}</h3>
                  <p className="text-xs font-medium text-primary mt-0.5">
                    {emp.jobTitle || "فني معمل"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {canManageEmployees && (
                  <button onClick={() => openEditModal(emp)} className="btn-icon" title="تعديل الموظف">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDeleteEmployees && (
                  <button onClick={() => handleDeleteEmployee(emp.id, emp.name)} className="btn-icon hover:!bg-red-50 text-red-500" title="حذف الموظف">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Info */}
            {(emp.baseSalary || emp.phone) && (
              <div className="space-y-1.5 pt-3 border-t border-gray-100">
                {emp.baseSalary && emp.baseSalary > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-muted">الراتب الأساسي:</span>
                    <span className="text-xs font-bold text-primary">{formatCurrency(emp.baseSalary)}</span>
                  </div>
                ) : null}
                {emp.phone && (
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{emp.phone}</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
              <span className="text-xs text-ink-muted">
                {emp._count?.expenses ?? 0} مصروفات مرتبطة
              </span>
              <span className="badge" style={{ background: "rgba(52, 199, 89, 0.1)", color: "#34c759" }}>
                نشط
              </span>
            </div>
          </div>
        ))}
      </div>



      {/* Modal Add/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-sheet max-w-lg animate-fadeIn">
            <div className="modal-header">
              <h3 className="text-base font-bold text-ink">
                {editingEmp ? `تعديل الموظف: ${editingEmp.name}` : "إضافة موظف جديد"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body">
                <div>
                  <label className="label">اسم الموظف *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: أحمد جمال"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">الوظيفة / التخصص</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: فني سيراميك / موصل"
                    value={form.jobTitle}
                    onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">رقم الهاتف</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="010..."
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">الراتب الأساسي (جم)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="مثال: 3500"
                    value={form.baseSalary}
                    onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingEmp ? "تعديل" : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


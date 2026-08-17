"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Stethoscope, Plus, Phone, MapPin, FolderOpen, Edit, Trash2, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Doctor {
  id: string;
  name: string;
  phone: string | null;
  clinicName: string | null;
  area: string | null;
  _count?: { cases: number };
}

export function DoctorsClient({ initialDoctors }: { initialDoctors: Doctor[] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doctor | null>(null);
  const [saving, setSaving] = useState(false);

  const perms = session?.user?.permissions;
  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canManageDoctors = isSuperOrAdmin || Boolean(perms?.canManageDoctors);
  const canDeleteDoctors = isSuperOrAdmin || Boolean(perms?.canDeleteDoctors);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    clinicName: "",
    area: "",
  });

  const openAddModal = () => {
    if (!canManageDoctors) {
      toast.error("عذراً، ليس لديك صلاحية إضافة أطباء جدد");
      return;
    }
    setEditingDoc(null);
    setForm({ name: "", phone: "", clinicName: "", area: "" });
    setShowModal(true);
  };

  const openEditModal = (doc: Doctor) => {
    if (!canManageDoctors) {
      toast.error("عذراً، ليس لديك صلاحية تعديل بيانات الأطباء");
      return;
    }
    setEditingDoc(doc);
    setForm({
      name: doc.name,
      phone: doc.phone || "",
      clinicName: doc.clinicName || "",
      area: doc.area || "",
    });
    setShowModal(true);
  };

  const handleDeleteDoctor = async (id: string, name: string) => {
    if (!canDeleteDoctors) {
      toast.error("عذراً، ليس لديك صلاحية حذف الأطباء");
      return;
    }

    if (!confirm(`هل أنت تأكد من حذف بيانات د. ${name}؟`)) return;

    try {
      const res = await fetch(`/api/doctors/${id}`, {
        method: "DELETE",
      });

      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "فشل حذف الطبيب");
        return;
      }

      setDoctors(prev => prev.filter(d => d.id !== id));
      toast.success("تم حذف بيانات الطبيب بنجاح ✓");
      router.refresh();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageDoctors) return;

    if (!form.name) {
      toast.error("أدخل اسم الدكتور");
      return;
    }

    setSaving(true);
    try {
      const url = editingDoc ? `/api/doctors/${editingDoc.id}` : "/api/doctors";
      const method = editingDoc ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "حدث خطأ أثناء الحفظ");

      toast.success(editingDoc ? "تم تعديل بيانات الدكتور بنجاح ✓" : "تم إضافة الدكتور بنجاح ✓");
      setShowModal(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-ink text-lg">قائمة الأطباء والعيادات</h2>
          <p className="text-xs text-ink-muted">
            إجمالي {doctors.length} طبيب يتعامل مع المعمل
          </p>
        </div>
        {canManageDoctors && (
          <button onClick={openAddModal} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            إضافة طبيب جديد
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {doctors.map((doc) => (
          <div key={doc.id} className="card">

            {/* Top: Avatar + Name + Actions */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
                  style={{ background: "var(--color-primary)" }}
                >
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-sm leading-snug">د. {doc.name}</h3>
                  {doc.clinicName && (
                    <p className="text-xs text-ink-muted mt-0.5">{doc.clinicName}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {canManageDoctors && (
                  <button onClick={() => openEditModal(doc)} className="btn-icon" title="تعديل">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDeleteDoctors && (
                  <button onClick={() => handleDeleteDoctor(doc.id, doc.name)} className="btn-icon hover:!bg-red-50 text-red-500" title="حذف">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Info rows */}
            {(doc.area || doc.phone) && (
              <div className="space-y-1.5 pt-3 border-t border-gray-100">
                {doc.area && (
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{doc.area}</span>
                  </div>
                )}
                {doc.phone && (
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{doc.phone}</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <FolderOpen className="w-3.5 h-3.5" />
                {doc._count?.cases ?? 0} حالة
              </span>
              <span className="badge" style={{ background: "rgba(52, 199, 89, 0.1)", color: "#34c759" }}>
                نشط
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Doctor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-sheet max-w-lg animate-fadeIn">
            <div className="modal-header">
              <h3 className="text-base font-bold text-ink">
                {editingDoc ? `تعديل بيانات د. ${editingDoc.name}` : "إضافة طبيب جديد"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form with Inner Padded Container */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body">
                <div>
                  <label className="label">اسم الدكتور *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: أحمد إبراهيم"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">اسم العيادة / المركز</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: عيادة الشروق للأسنان"
                    value={form.clinicName}
                    onChange={(e) => setForm((f) => ({ ...f, clinicName: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">المنطقة / العنوان</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: الجيزة / مايو / سقارة"
                    value={form.area}
                    onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
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
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingDoc ? "تعديل" : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

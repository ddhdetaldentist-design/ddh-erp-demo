"use client";

import { useState, useMemo } from "react";
import { Calendar, Plus, Clock, CheckCircle2, Circle, Loader2, Save, ArrowRight, FolderCheck, X, Trash2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Doctor { id: string; name: string }
interface ProductType { id: string; name: string; basePrice: number }
interface Case { id: string; caseCode: string; patientName: string }

interface Appointment {
  id: string;
  type: string;
  scheduledAt: Date;
  notes: string | null;
  isDone: boolean;
  doctor: Doctor;
  case: Case | null;
}

interface AppointmentsClientProps {
  initialAppointments: Appointment[];
  doctors: Doctor[];
  productTypes: ProductType[];
  cases: Case[];
}

const APPOINTMENT_TYPES = [
  { value: "PROOF_DELIVERY", label: "تسليم بروفة" },
  { value: "PROOF_RETURN",   label: "استلام بروفة" },
  { value: "CASE_DELIVERY",  label: "تسليم حالة نهائي" },
  { value: "CASE_RECEIPT",   label: "استلام حالة جديدة" },
  { value: "CONSULTATION",   label: "استشارة / متابعة" },
  { value: "OTHER",          label: "أخرى" },
];

export function AppointmentsClient({ initialAppointments, doctors, productTypes, cases }: AppointmentsClientProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canEditAppointments = isSuperOrAdmin || (session?.user?.permissions?.canEditAppointments ?? true);
  const canDeleteAppointments = isSuperOrAdmin || Boolean(session?.user?.permissions?.canDeleteAppointments);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const d = new Date(app.scheduledAt);
      const matchM = selectedMonth === 0 || d.getMonth() + 1 === selectedMonth;
      const matchY = d.getFullYear() === selectedYear;
      return matchM && matchY;
    });
  }, [appointments, selectedMonth, selectedYear]);

  const initialDate = new Date().toISOString().slice(0, 16);

  const [form, setForm] = useState({
    doctorId: "",
    patientName: "",
    productTypeId: "",
    units: "1",
    pricePerUnit: "",
    color: "",
    type: "PROOF_DELIVERY",
    scheduledAt: initialDate,
    deliveryDate: "",
    notes: "",
    isReceivedAtLab: true, // Default to true: "Arrived at Lab -> Move to Registered Cases"
  });

  const handleProductChange = (id: string) => {
    const pt = productTypes.find(p => p.id === id);
    setForm(f => ({
      ...f,
      productTypeId: id,
      pricePerUnit: pt ? String(pt.basePrice) : f.pricePerUnit,
    }));
  };

  const toggleDone = async (app: Appointment) => {
    if (!canEditAppointments) {
      toast.error("عذراً، ليس لديك صلاحية تعديل المواعيد");
      return;
    }

    const newStatus = !app.isDone;
    setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, isDone: newStatus } : a));

    try {
      const res = await fetch(`/api/appointments/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(newStatus ? "تم إكمال وتوثيق الموعد ✓" : "تم إعادة الموعد للجدول");
      router.refresh();
    } catch {
      toast.error("حدث خطأ في تحديث الحالة");
      setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, isDone: !newStatus } : a));
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!canDeleteAppointments) {
      toast.error("عذراً، ليس لديك صلاحية حذف المواعيد");
      return;
    }

    if (!confirm("هل أنت متأكد من حذف هذا الموعد؟")) return;

    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");

      setAppointments(prev => prev.filter(a => a.id !== id));
      toast.success("تم حذف الموعد بنجاح ✓");
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "حدث خطأ أثناء الحذف");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doctorId || !form.patientName || !form.productTypeId) {
      toast.error("اختر الدكتور واسم المريض ونوع التركيبة");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          units: parseFloat(form.units) || 1,
          pricePerUnit: parseFloat(form.pricePerUnit) || 0,
        }),
      });

      if (!res.ok) throw new Error();

      const newApp = await res.json();
      setAppointments(prev => [newApp, ...prev]);
      setShowModal(false);
      
      toast.success(
        form.isReceivedAtLab
          ? "تم حجز الموعد وتسجيل الحالة فورياً في الحالات المسجلة ✓"
          : "تم حجز الموعد بنجاح ✓"
      );
      
      router.push(form.isReceivedAtLab ? "/cases" : "/appointments");
      router.refresh();
    } catch {
      toast.error("حدث خطأ في الحفظ والتسجيل");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action with Month/Year Filters */}
      <div className="card bg-white p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-ink text-lg">جدول المواعيد والزيارات</h2>
          <p className="text-xs text-ink-muted">
            جدولة وتوثيق مواعيد التسليم والاستلام والزيارات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Filter */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input cursor-pointer font-bold text-xs"
              style={{ height: "36px", minWidth: "120px" }}
            >
              <option value={0}>كل الشهور</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>شهر {m}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input cursor-pointer font-bold text-xs"
              style={{ height: "36px", minWidth: "90px" }}
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {canEditAppointments && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm gap-1">
              <Plus className="w-4 h-4" />
              حجز موعد / حالة جديدة
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filteredAppointments.length === 0 ? (
        <div className="card items-center text-center py-16">
          <Calendar className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
          <h3 className="font-bold text-ink text-base mb-1">لا توجد مواعيد في هذه الفترة</h3>
          <p className="text-xs text-ink-muted mb-4">يمكنك جدولة موعد تسليم أو تسجيل حالة جديدة</p>
          {canEditAppointments && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm inline-flex">
              <Plus className="w-4 h-4" />
              حجز موعد / حالة جديدة
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAppointments.map((app) => {
            const typeObj = APPOINTMENT_TYPES.find(t => t.value === app.type);
            const isDone = app.isDone;
            return (
              <div
                key={app.id}
                className="card"
                style={{ borderRight: `3px solid ${isDone ? "#34c759" : "#ff9500"}` }}
              >
                {/* Top row: Type badge + Date */}
                <div className="flex items-center justify-between">
                  <span
                    className="badge text-xs font-semibold"
                    style={{ background: "rgba(0, 102, 204, 0.08)", color: "#0066cc" }}
                  >
                    {typeObj?.label || app.type}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-ink-muted">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    {formatDate(app.scheduledAt)}
                  </span>
                </div>

                {/* Doctor name */}
                <h3 className="font-bold text-ink text-sm leading-snug">د. {app.doctor.name}</h3>

                {/* Linked case */}
                {app.case && (
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                    <span className="text-xs font-mono font-bold text-primary">
                      #{app.case.caseCode} — {app.case.patientName}
                    </span>
                    <Link
                      href={`/cases/${app.case.id}`}
                      className="text-[11px] text-primary font-semibold hover:underline shrink-0 mr-2"
                    >
                      عرض ←
                    </Link>
                  </div>
                )}

                {/* Notes */}
                {app.notes && (
                  <p className="text-xs px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-900 leading-relaxed">
                    {app.notes}
                  </p>
                )}

                {/* Status toggle & Delete action */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
                  <button
                    onClick={() => toggleDone(app)}
                    disabled={!canEditAppointments}
                    className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-75 disabled:cursor-not-allowed"
                    style={{ color: isDone ? "#34c759" : "#ff9500" }}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span>{isDone ? "تمت الزيارة ✓" : "مجدول — انقر لإتمام"}</span>
                  </button>

                  {canDeleteAppointments && (
                    <button
                      onClick={() => handleDeleteAppointment(app.id)}
                      className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                      title="حذف الموعد"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL APPOINTMENT / NEW CASE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-sheet max-w-lg animate-fadeIn">
            <div className="modal-header">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  حجز موعد / تسجيل حالة جديدة
                </h3>
                <p className="text-xs text-ink-muted">تسجيل بيانات حالة جديدة بالكامل وحفظها بالمعمل</p>
              </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">
                  {/* Doctor */}
                  <div className="space-y-1.5">
                    <label className="label">الدكتور *</label>
                    <select
                      className="input cursor-pointer"
                      value={form.doctorId}
                      onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
                      required
                    >
                      <option value="">اختر الدكتور...</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          د. {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Patient Name */}
                  <div className="space-y-1.5">
                    <label className="label">اسم المريض *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="مثال: سعاد محمد"
                      value={form.patientName}
                      onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Product Type */}
                  <div className="space-y-1.5">
                    <label className="label">نوع التركيبة *</label>
                    <select
                      className="input cursor-pointer"
                      value={form.productTypeId}
                      onChange={(e) => handleProductChange(e.target.value)}
                      required
                    >
                      <option value="">اختر التركيبة...</option>
                      {productTypes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color */}
                  <div className="space-y-1.5">
                    <label className="label">اللون</label>
                    <input
                      type="text"
                      className="input font-mono"
                      placeholder="مثال: A1 / 3M1"
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    />
                  </div>

                  {/* Units */}
                  <div className="space-y-1.5">
                    <label className="label">عدد الوحدات</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={form.units}
                      onChange={(e) => setForm((f) => ({ ...f, units: e.target.value }))}
                    />
                  </div>

                  {/* Price per unit */}
                  <div className="space-y-1.5">
                    <label className="label">سعر الوحدة (جم)</label>
                    <input
                      type="number"
                      min="0"
                      className="input"
                      placeholder="مثال: 550"
                      value={form.pricePerUnit}
                      onChange={(e) => setForm((f) => ({ ...f, pricePerUnit: e.target.value }))}
                    />
                  </div>

                  {/* Appointment Type */}
                  <div className="space-y-1.5">
                    <label className="label">نوع الموعد / الزيارة</label>
                    <select
                      className="input cursor-pointer"
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    >
                      {APPOINTMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Scheduled At */}
                  <div className="space-y-1.5">
                    <label className="label">تاريخ ووقت الاستلام / الموعد *</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={form.scheduledAt}
                      onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Delivery Date */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="label">موعد التسليم المتوقع</label>
                    <input
                      type="date"
                      className="input"
                      value={form.deliveryDate}
                      onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))}
                    />
                  </div>

                  {/* Notes */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="label">ملاحظات الحالة والزيارة</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="أي ملاحظات خاصة بالتصنيع أو البروفة..."
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Automatic Move to Registered Cases Checkbox */}
                <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isReceivedAtLab"
                    checked={form.isReceivedAtLab}
                    onChange={(e) => setForm((f) => ({ ...f, isReceivedAtLab: e.target.checked }))}
                    className="w-5 h-5 accent-primary cursor-pointer shrink-0"
                  />
                  <label htmlFor="isReceivedAtLab" className="text-xs font-bold text-ink cursor-pointer leading-tight">
                    وصلت المعمل الآن (تسجيل فوري للحالة ونقلها تلقائياً إلى قائمة الحالات المسجلة)
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ وتسجيل الحالة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

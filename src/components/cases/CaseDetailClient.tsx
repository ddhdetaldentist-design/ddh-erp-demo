"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { appleStatusMap } from "@/components/shared/RecentCases";
import {
  CheckCircle2,
  Circle,
  Plus,
  Printer,
  Wallet,
  Loader2,
  FileText,
  UserCheck,
  ChevronDown,
  Edit,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ToothChart } from "./ToothChart";

export const paymentMethodMap: Record<string, { label: string }> = {
  CASH:          { label: "كاش (نقدي)" },
  INSTAPAY:      { label: "إنستا باي" },
  VODAFONE_CASH: { label: "فودافون كاش" },
  OTHER:         { label: "طريقة أخرى" },
};

export const SHADE_COLORS = [
  "0M1", "0M2", "0M3",
  "1M1", "1M2",
  "2L1.5", "2L2.5", "2M1", "2M2", "2M3", "2R1.5", "2R2.5",
  "3L1.5", "3L2.5", "3M1", "3M2", "3M3", "3R1.5", "3R2.5",
  "4L1.5", "4L2.5", "4M1", "4M2", "4M3", "4R1.5", "4R2.5",
  "5M1", "5M2", "5M3",
];

interface Payment {
  id: string;
  amount: number;
  paymentMethod?: string;
  courierId?: string | null;
  courier?: { id: string; name: string } | null;
  paidAt: Date;
  note: string | null;
}

interface Doctor {
  id: string;
  name: string;
}

interface ProductType {
  id: string;
  name: string;
  basePrice: number;
}

interface CaseItem {
  id: string;
  caseCode: string;
  patientName: string;
  totalAmount: number;
  collected: number;
  remaining: number;
  status: string;
  color: string | null;
  units: number;
  pricePerUnit: number;
  receivedAt: Date;
  deliveryDate: Date | null;
  proofSentAt: Date | null;
  proofReturnedAt: Date | null;
  notes: string | null;
  teethMap: number[];
  marginDone: boolean;
  latheeDone: boolean;
  glazeDone: boolean;
  designDone: boolean;
  doctorId: string;
  productTypeId: string;
  doctor: { name: string; clinicName: string | null; area: string | null; phone: string | null };
  productType: { name: string; basePrice: number };
  payments: Payment[];
}

interface Employee {
  id: string;
  name: string;
  jobTitle?: string | null;
}

interface CaseDetailClientProps {
  caseItem: CaseItem;
  doctors: Doctor[];
  productTypes: ProductType[];
  employees?: Employee[];
}

export function CaseDetailClient({ caseItem: initialData, doctors, productTypes, employees = [] }: CaseDetailClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<CaseItem>(initialData);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const perms = session?.user?.permissions;
  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  const canEditCases = isSuperOrAdmin || (perms?.canEditCases ?? true);
  const canDeleteCases = isSuperOrAdmin || Boolean(perms?.canDeleteCases);

  const [selectedTeeth, setSelectedTeeth] = useState<number[]>(data.teethMap || []);
  const handleTeethChange = useCallback(async (t: number[]) => {
    if (!canEditCases) {
      toast.error("عذراً، ليس لديك صلاحية تعديل الحالات");
      return;
    }
    setSelectedTeeth(t);
    try {
      const res = await fetch(`/api/cases/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teethMap: t, units: t.length > 0 ? t.length : undefined }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setData(updated);
      toast.success("تم تحديث خريطة الأسنان بنجاح ✓");
      router.refresh();
    } catch {
      toast.error("فشل حفظ خريطة الأسنان");
    }
  }, [canEditCases, data.id, router]);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [courierId, setCourierId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // Edit Payment Modal State
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPayAmount, setEditPayAmount] = useState("");
  const [editPayMethod, setEditPayMethod] = useState("CASH");
  const [editPayNote, setEditPayNote] = useState("");
  const [savingEditPayment, setSavingEditPayment] = useState(false);

  const openEditPayment = (p: Payment) => {
    setEditingPayment(p);
    setEditPayAmount(String(p.amount));
    setEditPayMethod(p.paymentMethod || "CASH");
    setEditPayNote(p.note || "");
  };

  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    const amount = parseFloat(editPayAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("أدخل مبلغاً صحيحاً");
      return;
    }
    setSavingEditPayment(true);
    try {
      const res = await fetch(`/api/cases/payments/${editingPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paymentMethod: editPayMethod, note: editPayNote }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result.case);
      setEditingPayment(null);
      toast.success("تم تحديث الدفعة بنجاح ✓");
      router.refresh();
    } catch {
      toast.error("فشل تحديث الدفعة");
    } finally {
      setSavingEditPayment(false);
    }
  };

  // Full Edit Case Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    caseCode: data.caseCode,
    doctorId: data.doctorId,
    patientName: data.patientName,
    productTypeId: data.productTypeId,
    color: data.color || "",
    units: String(data.units),
    pricePerUnit: String(data.pricePerUnit),
    receivedAt: new Date(data.receivedAt).toISOString().split("T")[0],
    deliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toISOString().split("T")[0] : "",
    notes: data.notes || "",
  });

  const openEditModal = () => {
    if (!canEditCases) {
      toast.error("عذراً، ليس لديك صلاحية تعديل الحالات");
      return;
    }
    setEditForm({
      caseCode: data.caseCode,
      doctorId: data.doctorId,
      patientName: data.patientName,
      productTypeId: data.productTypeId,
      color: data.color || "",
      units: String(data.units),
      pricePerUnit: String(data.pricePerUnit),
      receivedAt: new Date(data.receivedAt).toISOString().split("T")[0],
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toISOString().split("T")[0] : "",
      notes: data.notes || "",
    });
    setShowEditModal(true);
  };

  // Delete Case Handler
  const handleDeleteCase = async () => {
    if (!canDeleteCases) {
      toast.error("عذراً، ليس لديك صلاحية حذف الحالات");
      return;
    }

    if (!confirm(`هل أنت تأكد من حذف الحالة رقم #${data.caseCode} للمريض (${data.patientName}) نهائياً؟`)) return;

    try {
      const res = await fetch(`/api/cases/${data.id}`, {
        method: "DELETE",
      });

      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "فشل حذف الحالة");
        return;
      }

      toast.success("تم حذف الحالة بنجاح ✓");
      router.push("/cases");
      router.refresh();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  // Handle Full Case Edit Submission
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCases) return;
    setSavingEdit(true);

    try {
      const payload = {
        ...editForm,
        units: parseFloat(editForm.units),
        pricePerUnit: parseFloat(editForm.pricePerUnit),
        teethMap: selectedTeeth,
      };

      const res = await fetch(`/api/cases/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "فشل حفظ التعديلات");

      setData(body);
      setShowEditModal(false);
      toast.success("تم تحديث كافة بيانات الحالة بنجاح ✓");
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "فشل التعديل");
    } finally {
      setSavingEdit(false);
    }
  };

  // Update production stage checklist
  const toggleStage = async (stageKey: "marginDone" | "latheeDone" | "glazeDone" | "designDone") => {
    if (!canEditCases) {
      toast.error("عذراً، ليس لديك صلاحية تعديل المراحل");
      return;
    }
    const newValue = !data[stageKey];
    setData((prev) => ({ ...prev, [stageKey]: newValue }));

    try {
      const res = await fetch(`/api/cases/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [stageKey]: newValue }),
      });
      if (!res.ok) throw new Error();
      toast.success("تم تحديث مرحلة الإنتاج ✓");
      router.refresh();
    } catch {
      toast.error("فشل التحديث");
      setData((prev) => ({ ...prev, [stageKey]: !newValue }));
    }
  };

  // Update status dropdown
  const handleStatusChange = async (newStatus: string) => {
    if (!canEditCases) {
      toast.error("عذراً، ليس لديك صلاحية تعديل حالة الشغل");
      return;
    }
    if (newStatus === data.status) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/cases/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setData(updated);
      toast.success("تم تغيير حالة الشغل بنجاح ✓");
      router.refresh();
    } catch {
      toast.error("فشل تغيير الحالة");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Record payment
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("أدخل مبلغاً صحيحاً");
      return;
    }

    setSavingPayment(true);
    try {
      const res = await fetch(`/api/cases/${data.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          paymentMethod,
          courierId: courierId || null,
          note: paymentNote,
        }),
      });

      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result.case);
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentMethod("CASH");
      setCourierId("");
      setPaymentNote("");
      toast.success(`تم تسجيل تحصيل بقيمة ${amount} جم بنجاح ✓`);
      router.refresh();
    } catch {
      toast.error("حدث خطأ في التسجيل");
    } finally {
      setSavingPayment(false);
    }
  };

  const currentStatusInfo = appleStatusMap[data.status] ?? { label: data.status, style: {} };

  const stages = [
    { key: "marginDone" as const, label: "مارجين وسكان", desc: "إعداد المارجن والفحص الرقمي" },
    { key: "designDone" as const, label: "ديزاين", desc: "التصميم الرقمي CAD" },
    { key: "latheeDone" as const, label: "خرط / تفريز", desc: "تفريز الخرط CAM" },
    { key: "glazeDone" as const, label: "ستين وجليز", desc: "التجميل والتبطين النهائى" },
  ];

  const completedStagesCount = stages.filter((s) => data[s.key]).length;

  return (
    <div className="space-y-6">
      {/* Clean White Header Banner */}
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="font-mono text-2xl font-bold text-primary">#{data.caseCode}</span>
            <span className="badge" style={currentStatusInfo.style}>
              {currentStatusInfo.label}
            </span>
          </div>
          <h2 className="text-xl font-bold text-ink">
            د. {data.doctor?.name || "—"} {data.doctor?.area ? `(${data.doctor.area})` : ""}
          </h2>
          <p className="text-sm text-ink-muted">
            اسم الحالة: <strong className="text-ink">{data.patientName}</strong> · التركيبة:{" "}
            <strong className="text-ink">{data.productType?.name || "—"}</strong>
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEditCases && (
            <button
              onClick={openEditModal}
              className="btn btn-outlined btn-sm"
            >
              <Edit className="w-4 h-4" />
              تعديل بيانات الحالة
            </button>
          )}

          {canDeleteCases && (
            <button
              onClick={handleDeleteCase}
              className="btn btn-outlined btn-sm hover:!bg-red-50 text-red-600 border-red-200"
              title="حذف الحالة"
            >
              <Trash2 className="w-4 h-4" />
              حذف الحالة
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="btn btn-ghost btn-sm"
          >
            <Printer className="w-4 h-4" />
            طباعة الفاتورة
          </button>

          {canEditCases && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus className="w-4 h-4" />
              تسجيل تحصيل
            </button>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Production Stages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Production Stages Progress */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                مراحل الإنتاج في المعمل ({completedStagesCount}/4)
              </h3>
              <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: "rgba(0, 102, 204, 0.08)", color: "#0066cc" }}>
                {completedStagesCount === 4 ? "اكتملت جميع المراحل ✓" : "قيد التصنيع"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stages.map((stage) => {
                const isDone = data[stage.key];
                return (
                  <button
                    key={stage.key}
                    type="button"
                    disabled={!canEditCases}
                    onClick={() => toggleStage(stage.key)}
                    className="p-4 rounded-xl text-right flex items-start gap-3 transition-all cursor-pointer disabled:opacity-75"
                    style={{
                      background: isDone ? "rgba(0, 102, 204, 0.05)" : "var(--color-surface-cool)",
                      border: isDone ? "1.5px solid #0066cc" : "1px solid var(--color-border)",
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                    ) : (
                      <Circle className="w-5 h-5 shrink-0 mt-0.5 text-ink-subtle" />
                    )}
                    <div>
                      <p className={`font-bold text-sm ${isDone ? "text-primary" : "text-ink"}`}>
                        {stage.label}
                      </p>
                      <p className="text-xs mt-0.5 text-ink-muted">
                        {stage.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Info Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                تفاصيل الحالة
              </h3>
              {canEditCases && (
                <button onClick={openEditModal} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  <Edit className="w-3.5 h-3.5" /> تعديل الكل
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="label">كود الحالة</span>
                <span className="font-mono font-bold text-primary text-base">#{data.caseCode}</span>
              </div>
              <div>
                <span className="label">الدكتور</span>
                <span className="font-semibold text-ink">{data.doctor?.name || "—"}</span>
              </div>
              <div>
                <span className="label">اسم المريض</span>
                <span className="font-semibold text-ink">{data.patientName}</span>
              </div>
              <div>
                <span className="label">نوع التركيبة</span>
                <span className="font-semibold text-ink">{data.productType?.name || "—"}</span>
              </div>
              <div>
                <span className="label">اللون</span>
                <span className="font-mono font-semibold text-ink">{data.color || "غير محدد"}</span>
              </div>
              <div>
                <span className="label">عدد الوحدات</span>
                <span className="font-semibold text-ink">{data.units} وحدة</span>
              </div>
              <div>
                <span className="label">سعر الوحدة</span>
                <span className="font-semibold text-ink">{formatCurrency(data.pricePerUnit)}</span>
              </div>
              <div>
                <span className="label">تاريخ الاستلام</span>
                <span className="font-semibold text-ink">{formatDate(data.receivedAt)}</span>
              </div>
              <div>
                <span className="label">موعد التسليم المقترح</span>
                <span className="font-semibold text-ink">{formatDate(data.deliveryDate)}</span>
              </div>
            </div>

            {data.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="label">الملاحظات</span>
                <p className="text-sm text-ink bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {data.notes}
                </p>
              </div>
            )}
          </div>

          {/* Tooth Chart Card */}
          <div className="card">
            <h3 className="font-bold text-ink text-base mb-1 flex items-center gap-2">
              🦷 خريطة الأسنان
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-ink-muted)" }}>
                {selectedTeeth.length > 0 ? `(${selectedTeeth.length} سن محدد)` : "(اختياري)"}
              </span>
            </h3>
            <p style={{ fontSize: "11px", color: "var(--color-ink-subtle)", marginBottom: "14px", direction: "rtl" }}>
              حدد الأسنان المطلوب العمل عليها في هذه الحالة
            </p>
            <ToothChart selectedTeeth={selectedTeeth} onChange={handleTeethChange} />
          </div>
        </div>

        {/* Right Column: Status Dropdown & Financials */}
        <div className="space-y-6">
          {/* Status Dropdown Selector */}
          <div className="card space-y-3">
            <label className="font-bold text-ink text-base flex items-center justify-between">
              <span>تغيير حالة الشغل</span>
              {updatingStatus && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            </label>

            <div className="relative">
              <select
                value={data.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingStatus || !canEditCases}
                className="input cursor-pointer font-bold text-sm pr-4 pl-10 disabled:opacity-80"
                style={{
                  ...currentStatusInfo.style,
                  height: "44px",
                  borderRadius: "12px",
                }}
              >
                {Object.entries(appleStatusMap).map(([key, val]) => (
                  <option key={key} value={key} className="bg-white text-ink font-semibold">
                    {val.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
            </div>
          </div>

          {/* Financial Summary Card */}
          <div className="card">
            <h3 className="font-bold text-ink text-base mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              الماليات والتحصيل
            </h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-ink-muted">الإجمالي</span>
                <span className="font-bold text-base text-ink">{formatCurrency(data.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-ink-muted">المبلغ المحصَّل</span>
                <span className="font-bold text-base" style={{ color: "#34c759" }}>{formatCurrency(data.collected)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-bold text-ink">المتبقي</span>
                <span className="font-black text-lg" style={{ color: data.remaining > 0 ? "#d97706" : "#34c759" }}>
                  {formatCurrency(data.remaining)}
                </span>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider mb-3 text-ink-muted">
                سجل المدفوعات ({data.payments.length})
              </h4>
              {data.payments.length === 0 ? (
                <p className="text-xs text-center py-4 text-ink-muted">
                  لم يتم تسجيل أي مدفوعات لهذه الحالة
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.payments.map((p) => {
                    const pm = paymentMethodMap[p.paymentMethod || "CASH"] || paymentMethodMap["CASH"];
                    return (
                      <div
                        key={p.id}
                        className="flex justify-between items-start p-3 rounded-xl text-xs border border-gray-100"
                        style={{ background: "var(--color-surface-cool)" }}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm" style={{ color: "#34c759" }}>{formatCurrency(p.amount)}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-gray-200 text-slate-700">
                              {pm.label}
                            </span>
                          </div>
                          {p.courier?.name && (
                            <p className="text-[11px] text-primary font-medium">المندوب: {p.courier.name}</p>
                          )}
                          {p.note && <p className="text-[11px] text-ink-muted">{p.note}</p>}
                          <span className="text-ink-muted text-[11px]">{formatDate(p.paidAt)}</span>
                        </div>
                        {canEditCases && (
                          <button
                            onClick={() => openEditPayment(p)}
                            className="shrink-0 p-1.5 rounded-lg text-ink-subtle hover:text-primary hover:bg-blue-50 transition-colors"
                            title="تعديل الدفعة"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FULL EDIT CASE MODAL */}
      {showEditModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal-sheet max-w-lg animate-fadeIn">
            <div className="modal-header">
              <div>
                <h3 className="text-base font-bold text-ink">تعديل بيانات الحالة الكاملة</h3>
                <p className="text-xs text-ink-muted">تعديل كود الحالة، الدكتور، التركيبة، الوحدات، والسعر</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">
                  <div className="space-y-1.5">
                    <label className="label">كود الحالة *</label>
                    <input
                      type="text"
                      className="input font-mono font-bold"
                      value={editForm.caseCode}
                      onChange={(e) => setEditForm((f) => ({ ...f, caseCode: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="label">الدكتور *</label>
                    <select
                      className="input cursor-pointer"
                      value={editForm.doctorId}
                      onChange={(e) => setEditForm((f) => ({ ...f, doctorId: e.target.value }))}
                      required
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          د. {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="label">اسم المريض *</label>
                    <input
                      type="text"
                      className="input"
                      value={editForm.patientName}
                      onChange={(e) => setEditForm((f) => ({ ...f, patientName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="label">نوع التركيبة *</label>
                    <select
                      className="input cursor-pointer"
                      value={editForm.productTypeId}
                      onChange={(e) => setEditForm((f) => ({ ...f, productTypeId: e.target.value }))}
                      required
                    >
                      {productTypes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="label">اللون</label>
                    <select
                      className="input cursor-pointer font-mono"
                      value={editForm.color}
                      onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                    >
                      <option value="">— بدون لون —</option>
                      {SHADE_COLORS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="label">عدد الوحدات *</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={editForm.units}
                      onChange={(e) => setEditForm((f) => ({ ...f, units: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="label">سعر الوحدة (جم) *</label>
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={editForm.pricePerUnit}
                      onChange={(e) => setEditForm((f) => ({ ...f, pricePerUnit: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="label">تاريخ الاستلام *</label>
                    <input
                      type="date"
                      className="input"
                      value={editForm.receivedAt}
                      onChange={(e) => setEditForm((f) => ({ ...f, receivedAt: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="label">موعد التسليم المقترح</label>
                    <input
                      type="date"
                      className="input"
                      value={editForm.deliveryDate}
                      onChange={(e) => setEditForm((f) => ({ ...f, deliveryDate: e.target.value }))}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="label">الملاحظات</label>
                    <textarea
                      className="input"
                      rows={2}
                      value={editForm.notes}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-ghost btn-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={savingEdit} className="btn btn-primary btn-sm">
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPaymentModal(false)}>
          <div className="modal-sheet max-w-md animate-fadeIn">
            <div className="modal-header">
              <div>
                <h3 className="text-base font-bold text-ink">تسجيل دفعة جديدة</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  المتبقي للحالة: <strong style={{ color: "#d97706" }}>{formatCurrency(data.remaining)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-4">
                <div>
                  <label className="label">المبلغ (جم) *</label>
                  <input
                    type="number"
                    step="any"
                    className="input"
                    placeholder="مثال: 500"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">طريقة الدفع *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input cursor-pointer font-semibold text-sm"
                  >
                    {Object.entries(paymentMethodMap).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">المندوب / الموصل الفعلي (اختياري)</label>
                  <select
                    value={courierId}
                    onChange={(e) => setCourierId(e.target.value)}
                    className="input cursor-pointer text-sm"
                  >
                    <option value="">اختر المندوب الذي استلم التحصيل...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.jobTitle ? `(${emp.jobTitle})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">ملاحظة / رقم الدفعة</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: عربون مع الاستلام"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn btn-ghost btn-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="btn btn-primary btn-sm"
                >
                  {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الدفعة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT MODAL */}
      {editingPayment && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditingPayment(null)}>
          <div className="modal-sheet max-w-md animate-fadeIn">
            <div className="modal-header">
              <div>
                <h3 className="text-base font-bold text-ink">تعديل الدفعة</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  الدفعة الأصلية: <strong style={{ color: "#34c759" }}>{formatCurrency(editingPayment.amount)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPayment} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-4">
                <div>
                  <label className="label">المبلغ (جم) *</label>
                  <input
                    type="number"
                    step="any"
                    className="input"
                    value={editPayAmount}
                    onChange={(e) => setEditPayAmount(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">طريقة الدفع *</label>
                  <select
                    value={editPayMethod}
                    onChange={(e) => setEditPayMethod(e.target.value)}
                    className="input cursor-pointer font-semibold text-sm"
                  >
                    {Object.entries(paymentMethodMap).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">ملاحظة</label>
                  <input
                    type="text"
                    className="input"
                    value={editPayNote}
                    onChange={(e) => setEditPayNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setEditingPayment(null)} className="btn btn-ghost btn-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={savingEditPayment} className="btn btn-primary btn-sm">
                  {savingEditPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ التعديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

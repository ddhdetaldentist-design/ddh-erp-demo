"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentMethodMap } from "@/components/cases/CaseDetailClient";
import {
  ArrowLeftRight,
  Plus,
  Trash2,
  Loader2,
  X,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface FundTransfer {
  id: string;
  fromMethod: string;
  toMethod: string;
  amount: number;
  date: Date | string;
  notes: string | null;
  createdBy?: { name: string } | null;
}

interface FundTransfersClientProps {
  initialTransfers: FundTransfer[];
  month: number;
  year: number;
}

export function FundTransfersClient({ initialTransfers, month, year }: FundTransfersClientProps) {
  const { data: session } = useSession();
  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canManage = isSuperOrAdmin || Boolean(session?.user?.permissions?.canViewFinance);

  const [transfers, setTransfers] = useState<FundTransfer[]>(initialTransfers);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fromMethod: "CASH",
    toMethod: "INSTAPAY",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const fetchTransfers = async (m: number, y: number) => {
    try {
      const res = await fetch(`/api/finance/transfers?month=${m}&year=${y}`);
      if (res.ok) setTransfers(await res.json());
    } catch { /* silent */ }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.fromMethod === form.toMethod) {
      toast.error("طريقة المصدر والوجهة لا يمكن ان تكونا متماثلتين");
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("ادخل مبلغا صحيحا");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/finance/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "فشل التسجيل");
        return;
      }
      toast.success("تم تسجيل عملية التحويل بنجاح");
      setShowModal(false);
      setForm({ fromMethod: "CASH", toMethod: "INSTAPAY", amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
      fetchTransfers(month, year);
    } catch {
      toast.error("حدث خطا");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isSuperOrAdmin) { toast.error("ليس لديك صلاحية حذف التحويلات"); return; }
    if (!confirm("هل انت متاكد من حذف عملية التحويل؟")) return;
    try {
      const res = await fetch(`/api/finance/transfers?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("تم حذف التحويل بنجاح");
      fetchTransfers(month, year);
    } catch {
      toast.error("فشل الحذف");
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-ink text-base flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          تحويلات بين طرق الدفع
        </h3>
        {canManage && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm gap-1.5">
            <Plus className="w-4 h-4" />
            تحويل جديد
          </button>
        )}
      </div>

      <p className="text-xs text-ink-muted mb-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
        سجل عمليات التحويل من طريقة دفع لاخرى مثلا تحويل كاش الى انستاباي او العكس.
      </p>

      {transfers.length === 0 ? (
        <p className="text-xs text-center py-8 text-ink-subtle">
          لا توجد تحويلات مسجلة لهذا الشهر
        </p>
      ) : (
        <div className="space-y-2">
          {transfers.map((t) => {
            const from = paymentMethodMap[t.fromMethod]?.label || t.fromMethod;
            const to = paymentMethodMap[t.toMethod]?.label || t.toMethod;
            return (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">{from}</span>
                  <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" />
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">{to}</span>
                  <span className="font-extrabold text-sm text-primary">{formatCurrency(t.amount)}</span>
                  {t.notes && <span className="text-[11px] text-ink-subtle italic">{t.notes}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-ink-muted">{formatDate(t.date)}</span>
                  {isSuperOrAdmin && (
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                      title="حذف"
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

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-sheet max-w-md animate-fadeIn">
            <div className="modal-header">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-primary" />
                تسجيل عملية تحويل جديدة
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">من (المصدر) *</label>
                    <select
                      value={form.fromMethod}
                      onChange={(e) => setForm((f) => ({ ...f, fromMethod: e.target.value }))}
                      className="input cursor-pointer text-sm font-semibold"
                    >
                      {Object.entries(paymentMethodMap).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">الى (الوجهة) *</label>
                    <select
                      value={form.toMethod}
                      onChange={(e) => setForm((f) => ({ ...f, toMethod: e.target.value }))}
                      className="input cursor-pointer text-sm font-semibold"
                    >
                      {Object.entries(paymentMethodMap).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {form.fromMethod === form.toMethod && (
                  <p className="text-xs text-red-500 font-medium">طريقة المصدر والوجهة متماثلتان!</p>
                )}

                <div>
                  <label className="label">المبلغ (جم) *</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    className="input font-bold text-primary text-base"
                    placeholder="مثال: 2000"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">تاريخ التحويل *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">ملاحظات</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: تحويل كاش يوم الجمعة للانستاباي"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">
                  الغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || form.fromMethod === form.toMethod}
                  className="btn btn-primary btn-sm px-6"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التحويل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

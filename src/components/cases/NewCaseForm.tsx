"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Save, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ToothChart } from "./ToothChart";
import { SHADE_COLORS } from "./CaseDetailClient";

const caseSchema = z.object({
  caseCode:       z.string().min(1, "كود الحالة مطلوب"),
  doctorId:       z.string().min(1, "اختر الدكتور"),
  patientName:    z.string().min(1, "اسم المريض مطلوب"),
  productTypeId:  z.string().min(1, "اختر نوع التركيبة"),
  color:          z.string().optional(),
  units:          z.number({ message: "أدخل رقماً" }).min(1),
  pricePerUnit:   z.number({ message: "أدخل رقماً" }).min(0),
  receivedAt:     z.string().min(1, "تاريخ الاستلام مطلوب"),
  deliveryDate:   z.string().optional(),
  notes:          z.string().optional(),
  teethMap:       z.array(z.number()).optional(),
});

interface Doctor       { id: string; name: string }
interface ProductType  { id: string; name: string; basePrice: number }

interface NewCaseFormProps {
  doctors:      Doctor[];
  productTypes: ProductType[];
}

interface FieldProps {
  label: string;
  name: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}

// Standalone Field Component (OUTSIDE NewCaseForm to prevent losing focus on typing)
function Field({ label, children, required, error }: FieldProps) {
  return (
    <div>
      <label className="label">
        {label} {required && <span style={{ color: "var(--color-danger)" }}>*</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

const getLocalInitialCode = (dateString?: string) => {
  let day: number;
  let month: number;

  if (dateString && dateString.includes("-")) {
    const parts = dateString.split("-");
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    const now = new Date();
    day = now.getDate();
    month = now.getMonth() + 1;
  }

  const dayStr = String(day).padStart(2, "0");
  const monthStr = String(month).padStart(2, "0");

  // Formula: Day (2 digits) + Month (2 digits) + 11 (e.g., 210711)
  return `${dayStr}${monthStr}11`;
};

export function NewCaseForm({ doctors, productTypes }: NewCaseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingCode, setFetchingCode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initialDate = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    caseCode:      getLocalInitialCode(initialDate),
    doctorId:      "",
    patientName:   "",
    productTypeId: "",
    color:         "",
    units:         "1",
    pricePerUnit:  "",
    receivedAt:    initialDate,
    deliveryDate:  "",
    notes:         "",
  });

  // Selected teeth from chart
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);

  // When teeth change, auto-update units count
  const handleTeethChange = useCallback((teeth: number[]) => {
    setSelectedTeeth(teeth);
    if (teeth.length > 0) {
      setForm(f => ({ ...f, units: String(teeth.length) }));
    }
  }, []);

  // Fetch incremental next code from DB
  const fetchNextCode = useCallback(async (dateStr: string) => {
    setFetchingCode(true);
    try {
      const res = await fetch(`/api/cases/next-code?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        if (data.caseCode) {
          setForm(f => ({ ...f, caseCode: data.caseCode }));
        }
      }
    } catch {
      // fallback
    } finally {
      setFetchingCode(false);
    }
  }, []);

  useEffect(() => {
    fetchNextCode(initialDate);
  }, [initialDate, fetchNextCode]);

  const handleDateChange = (newDate: string) => {
    setForm(f => ({ ...f, receivedAt: newDate }));
    fetchNextCode(newDate);
  };

  const total = (parseFloat(form.units) || 0) * (parseFloat(form.pricePerUnit) || 0);

  const handleProductChange = (id: string) => {
    const pt = productTypes.find(p => p.id === id);
    setForm(f => ({
      ...f,
      productTypeId: id,
      pricePerUnit: pt ? String(pt.basePrice) : f.pricePerUnit,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const data = {
      ...form,
      units: parseFloat(form.units),
      pricePerUnit: parseFloat(form.pricePerUnit),
      teethMap: selectedTeeth,
    };

    const result = caseSchema.safeParse(data);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(err => {
        errs[err.path[0] as string] = err.message;
      });
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error ?? "فشل حفظ الحالة");
        return;
      }

      toast.success("تم إضافة الحالة بنجاح ✓");
      router.push("/cases");
      router.refresh();
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Single card: form fields LEFT + tooth chart RIGHT */}
      <div className="card">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8">

          {/* ─── LEFT: form fields ─── */}
          <div>
            <h2 className="font-bold text-ink text-base mb-5">بيانات الحالة الأساسية</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="كود الحالة (اليوم + الشهر + التسلسل — مثال: 210711)" name="caseCode" required error={errors.caseCode}>
                <div className="relative">
                  <input
                    className="input font-mono font-bold text-primary pl-10"
                    value={form.caseCode}
                    onChange={e => setForm(f => ({ ...f, caseCode: e.target.value }))}
                    placeholder={fetchingCode ? "جارٍ التوليد..." : "كود الحالة"}
                  />
                  <button
                    type="button"
                    onClick={() => fetchNextCode(form.receivedAt)}
                    disabled={fetchingCode}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-primary disabled:opacity-50"
                    title="إعادة توليد الكود التلقائي التسلسلي"
                  >
                    <RefreshCw className={`w-4 h-4 ${fetchingCode ? "animate-spin text-primary" : ""}`} />
                  </button>
                </div>
              </Field>

              <Field label="تاريخ الاستلام" name="receivedAt" required error={errors.receivedAt}>
                <input
                  type="date"
                  className="input"
                  value={form.receivedAt}
                  onChange={e => handleDateChange(e.target.value)}
                />
              </Field>

              <Field label="الدكتور" name="doctorId" required error={errors.doctorId}>
                <select
                  className="input"
                  value={form.doctorId}
                  onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}
                >
                  <option value="">اختر الدكتور...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="اسم المريض" name="patientName" required error={errors.patientName}>
                <input
                  className="input"
                  placeholder="اسم المريض"
                  value={form.patientName}
                  onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
                />
              </Field>

              <Field label="نوع التركيبة" name="productTypeId" required error={errors.productTypeId}>
                <select
                  className="input"
                  value={form.productTypeId}
                  onChange={e => handleProductChange(e.target.value)}
                >
                  <option value="">اختر التركيبة...</option>
                  {productTypes.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="اللون" name="color" error={errors.color}>
                <select
                  className="input cursor-pointer font-mono"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                >
                  <option value="">— بدون لون —</option>
                  {SHADE_COLORS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Field label="عدد الوحدات" name="units" required error={errors.units}>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={form.units}
                  onChange={e => setForm(f => ({ ...f, units: e.target.value }))}
                />
              </Field>

              <Field label="السعر للوحدة (جم)" name="pricePerUnit" required error={errors.pricePerUnit}>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.pricePerUnit}
                  onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value }))}
                />
              </Field>

              <Field label="معاد التسليم" name="deliveryDate" error={errors.deliveryDate}>
                <input
                  type="date"
                  className="input"
                  value={form.deliveryDate}
                  onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))}
                />
              </Field>

              {/* Total Preview */}
              <div
                className="rounded-2xl p-4 flex flex-col justify-center"
                style={{ background: "rgba(0, 102, 204, 0.06)", border: "1px solid rgba(0, 102, 204, 0.2)" }}
              >
                <p className="text-xs font-semibold text-primary">الإجمالي المتوقع</p>
                <p className="font-display text-2xl font-bold text-primary">
                  {total.toLocaleString("ar-EG")} جم
                </p>
              </div>
            </div>

            <div className="mt-4">
              <Field label="ملاحظات" name="notes" error={errors.notes}>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ borderRadius: "14px" }}
                />
              </Field>
            </div>
          </div>

          {/* ─── RIGHT: tooth chart ─── */}
          <div style={{
            borderRight: "1px solid var(--color-border, #e5e7eb)",
            paddingRight: "32px",
          }}>
            <h2 className="font-bold text-ink text-base mb-1 flex items-center gap-2" style={{ direction: "rtl" }}>
              🦷 خريطة الأسنان
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-ink-muted)" }}>
                (اختياري)
              </span>
            </h2>
            <p style={{ fontSize: "11px", color: "var(--color-ink-subtle)", marginBottom: "14px", direction: "rtl" }}>
              حدد الأسنان المطلوبة — عدد الوحدات يتحدث تلقائياً
            </p>
            <ToothChart selectedTeeth={selectedTeeth} onChange={handleTeethChange} />
          </div>

        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-ghost"
        >
          إلغاء
        </button>
        <button
          id="save-case"
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />جارٍ الحفظ...</>
          ) : (
            <><Save className="w-4 h-4" />حفظ الحالة</>
          )}
        </button>
      </div>
    </form>
  );
}


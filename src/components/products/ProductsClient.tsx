"use client";

import { useState } from "react";
import { Plus, Tag, Edit, Loader2, Save, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface ProductType {
  id: string;
  name: string;
  nameAr: string | null;
  basePrice: number;
  description: string | null;
  isActive: boolean;
  _count?: { cases: number };
}

export function ProductsClient({ initialProducts }: { initialProducts: ProductType[] }) {
  const router = useRouter();
  const { data: session } = useSession();

  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canManageProducts = isSuperOrAdmin || Boolean(session?.user?.permissions?.canManageProducts);
  const canDeleteProducts = isSuperOrAdmin || Boolean(session?.user?.permissions?.canDeleteProducts);

  const [products, setProducts] = useState<ProductType[]>(initialProducts);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    basePrice: "",
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setForm({ name: "", nameAr: "", basePrice: "" });
    setShowModal(true);
  };

  const openEditModal = (p: ProductType) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      nameAr: p.nameAr || "",
      basePrice: String(p.basePrice),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت تأكد من رغبتك في حذف نوع التركيبة هذا؟")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");

      toast.success("تم حذف التركيبة بنجاح ✓");
      setProducts((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "خطأ أثناء الحذف");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.basePrice) {
      toast.error("أدخل كود التركيبة والسعر الأساسي");
      return;
    }

    setSaving(true);
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          basePrice: parseFloat(form.basePrice),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل الحفظ");
      }

      toast.success(editingProduct ? "تم تعديل التركيبة بنجاح ✓" : "تم إضافة التركيبة بنجاح ✓");
      setShowModal(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ في عملية الحفظ";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-ink text-lg">أنواع التركيبات والمنتجات</h2>
          <p className="text-xs text-ink-muted">
            إجمالي {products.length} نوع تركيبات متاح بالمعمل
          </p>
        </div>
        {canManageProducts && (
          <button onClick={openAddModal} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            إضافة نوع جديد
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => (
          <div key={p.id} className="card">

            {/* Top: Name + Actions */}
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-sm font-extrabold text-primary">{p.name}</span>
                {p.nameAr && (
                  <p className="text-xs text-ink-muted mt-0.5">{p.nameAr}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {canManageProducts && (
                  <button onClick={() => openEditModal(p)} className="btn-icon shrink-0" title="تعديل التركيبة">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDeleteProducts && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    className="btn-icon text-red-500 hover:bg-red-50 shrink-0"
                    title="حذف التركيبة"
                  >
                    {deletingId === p.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="pt-3 border-t border-gray-100">
              <span className="text-[11px] text-ink-muted font-medium">سعر الوحدة</span>
              <p className="font-extrabold text-xl text-primary mt-0.5">
                {formatCurrency(p.basePrice)}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                <Tag className="w-3.5 h-3.5 text-primary" />
                {p._count?.cases ?? 0} حالة
              </span>
              <span className="badge" style={{ background: "rgba(52, 199, 89, 0.1)", color: "#34c759" }}>
                متاح
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-sheet max-w-md animate-fadeIn">
            <div className="modal-header">
              <h3 className="text-base font-bold text-ink">
                {editingProduct ? `تعديل: ${editingProduct.name}` : "إضافة نوع تركيبة جديد"}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-gray-100 transition-colors">
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body">
                <div>
                  <label className="label">كود / اسم التركيبة بالإنجليزية *</label>
                  <input
                    type="text"
                    className="input font-mono"
                    placeholder="مثال: ZDMAX / PFM / Retainer"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">الاسم بالعربي</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: زركون ماكس / ميتال سيراميك"
                    value={form.nameAr}
                    onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">سعر الوحدة (جم) *</label>
                  <input
                    type="number"
                    step="any"
                    className="input"
                    placeholder="مثال: 550"
                    value={form.basePrice}
                    onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">إلغاء</button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingProduct ? "تعديل" : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

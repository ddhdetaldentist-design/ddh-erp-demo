"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { appleStatusMap } from "@/components/shared/RecentCases";
import {
  Search,
  Filter,
  ExternalLink,
  Edit,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  CheckSquare,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Case {
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
  doctor: { name: string };
  productType: { name: string };
}

interface CasesTableProps {
  cases: Case[];
}

type SortKey = keyof Case | "doctor.name" | "productType.name";
type SortDir = "asc" | "desc";

export function CasesTable({ cases }: CasesTableProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("receivedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Bulk Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const perms = session?.user?.permissions;
  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canEditCases = isSuperOrAdmin || (perms?.canEditCases ?? true);
  const canDeleteCases = isSuperOrAdmin || Boolean(perms?.canDeleteCases);

  const filtered = useMemo(() => {
    let list = [...cases];

    // Filter by Month & Year of receivedAt date
    if (selectedMonth > 0) {
      list = list.filter((c) => {
        const d = new Date(c.receivedAt);
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
      });
    } else if (selectedYear) {
      list = list.filter((c) => {
        const d = new Date(c.receivedAt);
        return d.getFullYear() === selectedYear;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.caseCode.toLowerCase().includes(q) ||
          c.patientName.toLowerCase().includes(q) ||
          c.doctor.name.toLowerCase().includes(q) ||
          c.productType.name.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      list = list.filter((c) => c.status === statusFilter);
    }

    list.sort((a, b) => {
      let av: unknown, bv: unknown;
      if (sortKey === "doctor.name") { av = a.doctor.name; bv = b.doctor.name; }
      else if (sortKey === "productType.name") { av = a.productType.name; bv = b.productType.name; }
      else { av = a[sortKey as keyof Case]; bv = b[sortKey as keyof Case]; }

      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
      if (typeof av === "number") return sortDir === "asc" ? av - Number(bv) : Number(bv) - av;
      if (av instanceof Date) return sortDir === "asc" ? av.getTime() - new Date(bv as Date).getTime() : new Date(bv as Date).getTime() - av.getTime();
      return 0;
    });

    return list;
  }, [cases, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Checkbox handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === paginated.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginated.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Status Change
  const handleBulkStatusChange = async (statusToApply?: string) => {
    const targetStatus = statusToApply || bulkStatus;
    if (!targetStatus) {
      toast.error("اختر الحالة المراد تطبيقها أولاً");
      return;
    }
    if (!canEditCases) {
      toast.error("عذراً، ليس لديك صلاحية تعديل الحالات");
      return;
    }

    setBulkUpdating(true);
    try {
      const res = await fetch("/api/cases/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحديث الجماعي");

      toast.success(`تم تغيير حالة ${selectedIds.length} حالة بنجاح ✓`);
      setSelectedIds([]);
      setBulkStatus("");
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "فشل التحديث الجماعي");
    } finally {
      setBulkUpdating(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!canDeleteCases) {
      toast.error("عذراً، ليس لديك صلاحية حذف الحالات");
      return;
    }

    if (!confirm(`هل أنت تأكد من حذف ${selectedIds.length} حالة بشكل نهائي؟`)) return;

    setBulkUpdating(true);
    try {
      const res = await fetch("/api/cases/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف الجماعي");

      toast.success(`تم حذف ${selectedIds.length} حالة بنجاح ✓`);
      setSelectedIds([]);
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "فشل الحذف الجماعي");
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-primary" />
      : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  const statuses = Object.entries(appleStatusMap);

  return (
    <div className="card p-0 overflow-hidden relative">
      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div
          className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 p-3.5 px-5 bg-primary text-white shadow-lg animate-fadeIn"
          style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.2)" }}
        >
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            <span className="font-bold text-sm">
              تم تحديد {selectedIds.length} حالة
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEditCases && (
              <div className="flex items-center gap-2 bg-white/10 p-1 px-2 rounded-xl border border-white/20">
                <span className="text-xs text-white/90">تغيير الحالة إلى:</span>
                <select
                  value={bulkStatus}
                  onChange={(e) => {
                    setBulkStatus(e.target.value);
                    if (e.target.value) handleBulkStatusChange(e.target.value);
                  }}
                  disabled={bulkUpdating}
                  className="bg-white text-ink font-semibold text-xs rounded-lg px-2.5 py-1.5 cursor-pointer outline-none"
                >
                  <option value="">اختر حالة...</option>
                  {statuses.map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            )}

            {canDeleteCases && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkUpdating}
                className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none gap-1.5"
              >
                {bulkUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                حذف المحدد
              </button>
            )}

            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title="إلغاء التحديد"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 bg-white"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {/* Search Input (Pill) */}
        <div className="relative flex-1 min-w-48">
          <Search
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--color-ink-subtle)" }}
          />
          <input
            type="search"
            placeholder="بحث بالكود / الدكتور / المريض..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pr-10"
            style={{ height: "38px" }}
          />
        </div>

        {/* Month Filter */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(Number(e.target.value)); setPage(1); }}
            className="input cursor-pointer text-xs font-semibold"
            style={{ height: "38px", minWidth: "120px" }}
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
            onChange={(e) => { setSelectedYear(Number(e.target.value)); setPage(1); }}
            className="input cursor-pointer text-xs font-semibold"
            style={{ height: "38px", minWidth: "90px" }}
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="relative">
          <Filter
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--color-ink-subtle)" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input pr-10"
            style={{ height: "38px", minWidth: "150px" }}
          >
            <option value="">كل مراحل الشغل</option>
            {statuses.map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        <span className="text-xs font-semibold" style={{ color: "var(--color-ink-muted)" }}>
          {filtered.length} نتيجة
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10 text-center">
                <input
                  type="checkbox"
                  checked={paginated.length > 0 && selectedIds.length === paginated.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded-md accent-primary cursor-pointer"
                  title="تحديد الكل في هذه الصفحة"
                />
              </th>
              <th>
                <button onClick={() => handleSort("caseCode")} className="flex items-center gap-1 cursor-pointer">
                  الكود <SortIcon k="caseCode" />
                </button>
              </th>
              <th>
                <button onClick={() => handleSort("doctor.name")} className="flex items-center gap-1 cursor-pointer">
                  الدكتور <SortIcon k="doctor.name" />
                </button>
              </th>
              <th>المريض</th>
              <th>التركيبة</th>
              <th>اللون</th>
              <th>
                <button onClick={() => handleSort("units")} className="flex items-center gap-1 cursor-pointer">
                  الوحدات <SortIcon k="units" />
                </button>
              </th>
              <th>
                <button onClick={() => handleSort("totalAmount")} className="flex items-center gap-1 cursor-pointer">
                  الإجمالي <SortIcon k="totalAmount" />
                </button>
              </th>
              <th>التحصيل</th>
              <th>المتبقي</th>
              <th>الحالة</th>
              <th>
                <button onClick={() => handleSort("receivedAt")} className="flex items-center gap-1 cursor-pointer">
                  الاستلام <SortIcon k="receivedAt" />
                </button>
              </th>
              <th>التسليم</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-12" style={{ color: "var(--color-ink-muted)" }}>
                  لا توجد نتائج مطابقة
                </td>
              </tr>
            ) : (
              paginated.map((c) => {
                const statusInfo = appleStatusMap[c.status] ?? { label: c.status, style: {} };
                const isOverdue = c.deliveryDate && new Date(c.deliveryDate) < new Date() && !["COMPLETED","DELIVERED","CANCELLED"].includes(c.status);
                const isSelected = selectedIds.includes(c.id);

                return (
                  <tr key={c.id} className={`${isSelected ? "bg-blue-50/70" : isOverdue ? "border-r-4 border-r-red-500 bg-red-50/50" : ""}`}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 rounded-md accent-primary cursor-pointer"
                      />
                    </td>
                    <td>
                      <span className="font-mono text-sm font-bold text-primary">
                        #{c.caseCode}
                      </span>
                    </td>
                    <td className="font-semibold text-ink">{c.doctor.name}</td>
                    <td style={{ color: "var(--color-ink-muted)" }}>{c.patientName}</td>
                    <td>
                      <span className="badge" style={{ background: "var(--color-canvas)", color: "var(--color-ink)" }}>
                        {c.productType.name}
                      </span>
                    </td>
                    <td style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}>
                      {c.color ?? "—"}
                    </td>
                    <td className="text-center font-medium">{c.units}</td>
                    <td className="font-semibold text-ink">{formatCurrency(c.totalAmount)}</td>
                    <td style={{ color: "#34c759", fontWeight: 600 }}>{formatCurrency(c.collected)}</td>
                    <td style={{ color: c.remaining > 0 ? "#d97706" : "#34c759", fontWeight: 600 }}>
                      {formatCurrency(c.remaining)}
                    </td>
                    <td>
                      <span className="badge" style={statusInfo.style}>{statusInfo.label}</span>
                    </td>
                    <td style={{ color: "var(--color-ink-muted)", fontSize: "12px" }}>
                      {formatDate(c.receivedAt)}
                    </td>
                    <td style={{ color: isOverdue ? "#ff3b30" : "var(--color-ink-muted)", fontSize: "12px", fontWeight: isOverdue ? 700 : 400 }}>
                      {formatDate(c.deliveryDate)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link href={`/cases/${c.id}`} className="btn-icon" title="تفاصيل">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        {canEditCases && (
                          <Link href={`/cases/${c.id}?edit=1`} className="btn-icon" title="تعديل">
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between p-4 bg-white"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
            صفحة {page} من {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-ghost btn-sm"
            >
              السابق
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-ghost btn-sm"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

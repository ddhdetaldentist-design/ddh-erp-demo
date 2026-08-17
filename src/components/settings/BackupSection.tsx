"use client";

import { useState } from "react";
import {
  Database,
  FileSpreadsheet,
  FileCode,
  FileJson,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Server,
  FolderCheck,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export interface DatabaseStats {
  casesCount: number;
  doctorsCount: number;
  productsCount: number;
  paymentsCount: number;
  expensesCount: number;
  employeesCount: number;
  appointmentsCount: number;
  usersCount: number;
}

interface BackupSectionProps {
  stats: DatabaseStats;
  isAdmin: boolean;
}

export function BackupSection({ stats, isAdmin }: BackupSectionProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<"excel" | "sql" | "json" | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Direct export download handler
  const handleExport = async (format: "excel" | "sql" | "json") => {
    try {
      setDownloadingFormat(format);
      const res = await fetch(`/api/backup/export?type=${format}`);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "فشل تحميل ملف النسخة الاحتياطية");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const dateStr = new Date().toISOString().split("T")[0];
      if (format === "excel") {
        link.download = `DDH-ERP-Full-Backup-${dateStr}.xlsx`;
      } else if (format === "sql") {
        link.download = `DDH-ERP-PostgreSQL-Backup-${dateStr}.sql`;
      } else {
        link.download = `DDH-ERP-Backup-${dateStr}.json`;
      }

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        format === "excel"
          ? "تم تنزيل شيت أكسيل النسخة الاحتياطية بنجاح ✓"
          : format === "sql"
          ? "تم تنزيل ملف داتا بيز PostgreSQL (SQL Dump) بنجاح ✓"
          : "تم تنزيل النسخة الاحتياطية JSON بنجاح ✓"
      );
    } catch (err: unknown) {
      toast.error((err as Error).message || "حدث خطأ أثناء التصدير");
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Restore backup handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".json")) {
        toast.error("يرجى اختيار ملف نسخة احتياطية بصيغة JSON");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("حدد ملف النسخة الاحتياطية أولاً");
      return;
    }

    if (!confirm("هل أنت تأكد من استرجاع وتحديث بيانات الداتا بيز بهذه النسخة الاحتياطية؟")) {
      return;
    }

    setRestoring(true);
    try {
      const text = await selectedFile.text();
      const jsonContent = JSON.parse(text);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonContent),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل استرجاع البيانات");

      toast.success(data.message || "تم استرجاع واستيراد البيانات بنجاح ✓");
      setShowRestoreModal(false);
      setSelectedFile(null);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: unknown) {
      toast.error((err as Error).message || "خطأ أثناء معالجة ملف الاسترجاع");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Database Quick Summary Banner */}
      <div className="card bg-gradient-to-l from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-blue-800/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 -mt-10 -ml-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>نظام الأمان والاطمئنان على بيانات المعمل</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-400" />
              النسخ الاحتياطي واستعادة قاعدة البيانات
            </h2>
            <p className="text-sm text-blue-100/80 max-w-2xl leading-relaxed">
              يمكنك تصدير كافة بيانات النظام (الحالات، الأطباء، المصروفات، التحصيلات، التركيبات، والموظفين) في ملف واحد أكسيل منظم، أو سكريبت SQL متكامل لقواعد بيانات PostgreSQL لاستئناف العمل فوراً على أي جهاز آخر.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-all flex items-center gap-2 border border-white/10"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث الملخص
            </button>
          </div>
        </div>

        {/* Database Entities Count Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/5 text-center">
            <span className="text-xs text-blue-200 block font-medium">الحالات</span>
            <span className="text-lg font-extrabold text-white">{stats.casesCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/5 text-center">
            <span className="text-xs text-blue-200 block font-medium">الأطباء</span>
            <span className="text-lg font-extrabold text-white">{stats.doctorsCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/5 text-center">
            <span className="text-xs text-blue-200 block font-medium">التركيبات</span>
            <span className="text-lg font-extrabold text-white">{stats.productsCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/5 text-center">
            <span className="text-xs text-blue-200 block font-medium">التحصيلات</span>
            <span className="text-lg font-extrabold text-white">{stats.paymentsCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/5 text-center">
            <span className="text-xs text-blue-200 block font-medium">المصروفات</span>
            <span className="text-lg font-extrabold text-white">{stats.expensesCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/5 text-center">
            <span className="text-xs text-blue-200 block font-medium">الموظفون</span>
            <span className="text-lg font-extrabold text-white">{stats.employeesCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/5 text-center">
            <span className="text-xs text-blue-200 block font-medium">المواعيد</span>
            <span className="text-lg font-extrabold text-white">{stats.appointmentsCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/5 text-center">
            <span className="text-xs text-blue-200 block font-medium">المستخدمون</span>
            <span className="text-lg font-extrabold text-white">{stats.usersCount}</span>
          </div>
        </div>
      </div>

      {/* Main Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARD 1: EXCEL BACKUP */}
        <div className="card bg-white p-6 space-y-4 hover:shadow-md transition-all border border-gray-100 flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-lg text-ink flex items-center gap-2">
              تصدير ملف أكسيل مدمج
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">.xlsx</span>
            </h3>

            <p className="text-xs text-ink-muted leading-relaxed">
              ينشئ ملف Excel متكامل يحتوي على شيتات منفصلة لكافة جداول وسجلات النظام بأعمدة ومسميات عربية دقيقة. مناسب للعرض ولأعمال الحسابات الخارجية.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => handleExport("excel")}
              disabled={downloadingFormat !== null}
              className="btn btn-primary w-full justify-center !bg-emerald-600 hover:!bg-emerald-700 text-white gap-2 shadow-xs"
            >
              {downloadingFormat === "excel" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>تحميل نسختك (Excel) الآن</span>
            </button>
          </div>
        </div>

        {/* CARD 2: POSTGRESQL SQL DUMP */}
        <div className="card bg-white p-6 space-y-4 hover:shadow-md transition-all border border-gray-100 flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
              <FileCode className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-lg text-ink flex items-center gap-2">
              داتا بيز PostgreSQL كاملة
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-primary font-bold">.sql</span>
            </h3>

            <p className="text-xs text-ink-muted leading-relaxed">
              سكريبت PostgreSQL SQL Dump متكامل يحتوي على جميع الاستعلامات والبيانات المسجلة. جاهز للتشغيل مباشرة في pgAdmin أو Supabase أو أي سيرفر آخر.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => handleExport("sql")}
              disabled={downloadingFormat !== null}
              className="btn btn-primary w-full justify-center gap-2 shadow-xs"
            >
              {downloadingFormat === "sql" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>تحميل داتا بيز PostgreSQL (.sql)</span>
            </button>
          </div>
        </div>

        {/* CARD 3: RESTORE / JSON BACKUP */}
        <div className="card bg-white p-6 space-y-4 hover:shadow-md transition-all border border-gray-100 flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
              <FileJson className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-lg text-ink flex items-center gap-2">
              نسخة JSON واسترجاع البيانات
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">.json</span>
            </h3>

            <p className="text-xs text-ink-muted leading-relaxed">
              تصدير هيكلي سريع بصيغة JSON أو رفع واسترجاع البيانات المسجلة مسبقاً لاستعادتها فوراً على السيرفر الحالي بدون أي فقدان للبيانات.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleExport("json")}
                disabled={downloadingFormat !== null}
                className="btn btn-ghost border border-gray-200 text-xs justify-center gap-1.5"
              >
                {downloadingFormat === "json" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>تصدير JSON</span>
              </button>

              <button
                onClick={() => setShowRestoreModal(true)}
                disabled={!isAdmin}
                className="btn btn-primary btn-outline text-xs justify-center gap-1.5 !text-amber-700 border-amber-300 hover:!bg-amber-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>استرجاع (Restore)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Instructions Notice */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-ink text-sm block">نصائح وإرشادات الأمان لأخذ النسخ الاحتياطية:</span>
          <p className="leading-relaxed">
            • يُنصح بإنشاء وتنزيل نسخة احتياطية دورية (أسبوعياً أو شهرياً) والاحتفاظ بها في مكان آمن خارج الجهاز (مثل Google Drive أو وحدة تخزين خارجية).
            <br />
            • ملف الـ <strong>Excel</strong> يحتوي على جميع شيتات المعمل بصورة سهلة للقراءة، بينما ملف الـ <strong>PostgreSQL SQL</strong> يُستخدم في حالة إعادة تشغيل النظام أو نقل الداتا بيز لسيرفر جديد.
          </p>
        </div>
      </div>

      {/* MODAL: RESTORE BACKUP */}
      {showRestoreModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowRestoreModal(false)}>
          <div className="modal-sheet max-w-md animate-fadeIn">
            <div className="modal-header">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Upload className="w-5 h-5 text-amber-600" />
                  استرجاع نسخة احتياطية للبيانات
                </h3>
                <p className="text-xs text-ink-muted">حدد ملف النسخة الاحتياطية (.json) لاستعادة بيانات النظام</p>
              </div>
            </div>

            <form onSubmit={handleRestoreSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-4">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>تنبيه هام جداً:</span>
                  </div>
                  <p>
                    سيتم تحديث السجلات والحالات والمصروفات الحالية بالبيانات الموجودة في ملف النسخة الاحتياطية. يرجى التأكد من اختيار الملف الصحيح.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="label">اختر ملف النسخة الاحتياطية (.json) *</label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="file-input input text-xs py-2"
                    required
                  />
                </div>

                {selectedFile && (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs flex items-center gap-2">
                    <FolderCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="overflow-hidden">
                      <span className="font-bold text-ink block truncate">{selectedFile.name}</span>
                      <span className="text-ink-muted font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="btn btn-ghost btn-sm"
                  disabled={restoring}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={restoring || !selectedFile}
                  className="btn btn-primary btn-sm !bg-amber-600 hover:!bg-amber-700 text-white"
                >
                  {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>بدء الاسترجاع الآن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

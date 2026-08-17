import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

// ─── Tailwind class merging ───────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency formatting ──────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("ar-EG").format(num);
}

// ─── Date formatting ─────────────────────────────────────
export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy", { locale: ar });
}

export function formatDateLong(date: Date | string | null): string {
  if (!date) return "—";
  return format(new Date(date), "EEEE، d MMMM yyyy", { locale: ar });
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
}

export function getMonthName(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return format(date, "MMMM yyyy", { locale: ar });
}

// ─── Case code generation ─────────────────────────────────
export function generateCaseCode(lastCode: string | null): string {
  if (!lastCode) return "10001";
  const num = parseInt(lastCode, 10);
  return isNaN(num) ? "10001" : String(num + 1);
}

// ─── Status helpers ───────────────────────────────────────
export const caseStatusMap: Record<string, { label: string; color: string }> = {
  RECEIVED:       { label: "استُلم",          color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  IN_PROGRESS:    { label: "جاري التصنيع",    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  PROOF_SENT:     { label: "ذهبت البروفة",    color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  PROOF_RETURNED: { label: "عادت البروفة",    color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  COMPLETED:      { label: "اكتملت",          color: "bg-green-500/20 text-green-300 border-green-500/30" },
  DELIVERED:      { label: "سُلِّمت",          color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  CANCELLED:      { label: "ملغاة",           color: "bg-red-500/20 text-red-300 border-red-500/30" },
};

export const expenseCategoryMap: Record<string, { label: string }> = {
  RENT:        { label: "إيجار" },
  SALARY:      { label: "مرتبات" },
  TRANSPORT:   { label: "مواصلات وشحن" },
  SUPPLIES:    { label: "خامات ومستلزمات" },
  UTILITIES:   { label: "مرافق وفواتير" },
  LAB_INVOICE: { label: "فاتورة معمل" },
  OTHER:       { label: "مصروفات أخرى" },
};

// ─── Misc ─────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "..." : str;
}

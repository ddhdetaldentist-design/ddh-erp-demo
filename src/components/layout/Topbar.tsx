"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Search, Menu, Loader2, Stethoscope, User, Package, BellOff } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { appleStatusMap } from "@/components/shared/RecentCases";
import { useDashboard } from "@/components/layout/DashboardShell";

interface TopbarProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onMenuToggle?: () => void;
}

interface Case {
  id: string;
  caseCode: string;
  patientName: string;
  status: string;
  doctor: { name: string };
  productType: { name: string };
}

export function Topbar({ title, subtitle, action, onMenuToggle }: TopbarProps) {
  const { data: session } = useSession();
  const { onMenuToggle: contextToggle } = useDashboard();
  const handleMenuToggle = onMenuToggle ?? contextToggle;
  const [cases, setCases] = useState<Case[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = session?.user?.name
    ? session.user.name.split(" ").slice(0, 2).map((n) => n[0]).join("")
    : "U";

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/cases/delivery-today");
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchCases();
    // Refresh notifications every 5 minutes
    const interval = setInterval(fetchCases, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleDropdown = async () => {
    if (!isOpen) {
      setLoading(true);
      await fetchCases();
      setLoading(false);
    }
    setIsOpen(!isOpen);
  };

  return (
    <header
      className="flex items-center gap-4 px-6 backdrop-blur-md"
      style={{
        height: "var(--topbar-height)",
        borderBottom: "1px solid var(--color-border)",
        background: "rgba(255, 255, 255, 0.85)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Mobile menu toggle */}
      <button
        className="mobile-only btn-icon"
        onClick={handleMenuToggle}
        aria-label="القائمة"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-lg font-bold text-ink truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs truncate" style={{ color: "var(--color-ink-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Search Input (Apple Search Pill) */}
      <div className="hidden md:flex items-center gap-2 flex-1 max-w-xs">
        <div className="relative w-full">
          {/* <Search
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--color-ink-subtle)" }}
          /> */}
          {/* <input
            type="search"
            placeholder="بحث..."
            className="input pr-10 pl-4 font-medium"
            style={{ height: "36px", fontSize: "13px" }}
          /> */}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Demo Mode Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>نسخة تجريبية</span>
        </div>

        {action}

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="topbar-notifications"
            className="btn-icon relative"
            aria-label="الإشعارات"
            onClick={handleToggleDropdown}
          >
            <Bell className="w-4 h-4" />
            {cases.length > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs animate-pulse"
                style={{ background: "var(--color-primary)" }}
              >
                {cases.length}
              </span>
            )}
          </button>

          {isOpen && (
            <div
              className="absolute left-0 mt-3 w-80 max-w-[calc(100vw-32px)] max-h-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl z-50 flex flex-col shadow-xl animate-fadeIn"
              style={{
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)",
                direction: "rtl",
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="font-bold text-ink text-sm">حالات تسليم اليوم</h4>
                </div>
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/40"
                >
                  {cases.length} {cases.length === 1 ? "حالة" : "حالات"}
                </span>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/20 p-4 space-y-3">
                {loading && cases.length === 0 ? (
                  <div className="p-12 flex flex-col items-center justify-center gap-3 text-xs text-ink-muted">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span>جاري جلب حالات اليوم...</span>
                  </div>
                ) : cases.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-gray-100 flex items-center justify-center text-ink-subtle">
                      <BellOff className="w-5 h-5 opacity-40 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-ink">لا توجد حالات تسليم اليوم</p>
                    {/* <p className="text-[11px] text-ink-muted">جميع الحالات مجدولة لأيام أخرى أو تم تسليمها 🎉</p> */}
                  </div>
                ) : (
                  <>
                    {cases.map((c) => {
                      const statusInfo = appleStatusMap[c.status] ?? {
                        label: c.status,
                        style: { background: "#eee", color: "#333" },
                      };
                      return (
                        <Link
                          key={c.id}
                          href={`/cases/${c.id}`}
                          onClick={() => setIsOpen(false)}
                          className="card group block hover:border-primary/40 hover:shadow-md transition-all duration-200 text-right p-5"
                          style={{ gap: "12px" }}
                        >
                          {/* Top: Avatar + Name + Status */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
                                style={{ background: "var(--color-primary)" }}
                              >
                                <Stethoscope className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-ink text-sm leading-snug">د. {c.doctor?.name}</h3>
                                <p className="text-[11px] text-ink-muted mt-0.5">كود: #{c.caseCode}</p>
                              </div>
                            </div>
                            
                            <span
                              className="badge text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-3xs shrink-0"
                              style={statusInfo.style}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                          
                          {/* Info rows */}
                          <div className="space-y-2 pt-3.5 border-t border-gray-150 mt-1">
                            <div className="flex items-center gap-2.5 text-xs text-ink-muted">
                              <User className="w-4 h-4 text-primary shrink-0" />
                              <span>المريض: <strong className="text-ink font-bold">{c.patientName}</strong></span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-ink-muted">
                              <Package className="w-4 h-4 text-primary shrink-0" />
                              <span>التركيبة: <strong className="text-ink font-bold">{c.productType?.name}</strong></span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs"
          style={{ background: "var(--color-primary)" }}
          title={session?.user?.name ?? ""}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}

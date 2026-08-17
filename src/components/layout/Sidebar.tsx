"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Stethoscope,
  Calendar,
  Wallet,
  Users,
  Package,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Receipt,
  UserCheck,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const perms = session?.user?.permissions;
  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  // Dynamic nav filtering based on active user permissions
  const canViewCases        = isSuperOrAdmin || (perms?.canViewCases ?? true);
  const canViewDoctors      = isSuperOrAdmin || (perms?.canViewDoctors ?? true);
  const canViewCouriers     = isSuperOrAdmin || (perms?.canViewCouriers ?? true);
  const canViewAppointments = isSuperOrAdmin || (perms?.canViewAppointments ?? true);
  const canViewFinance      = isSuperOrAdmin || Boolean(perms?.canViewFinance);
  const canManageExpenses   = isSuperOrAdmin || Boolean(perms?.canManageExpenses) || Boolean(perms?.canDeleteExpenses);
  const canViewEmployees    = isSuperOrAdmin || (perms?.canViewEmployees ?? perms?.canManageEmployees ?? true);
  const canViewProducts     = isSuperOrAdmin || (perms?.canViewProducts ?? perms?.canManageProducts ?? true);
  const canViewReports       = isSuperOrAdmin || Boolean(perms?.canViewReports);
  const canManageSettings    = isSuperOrAdmin || Boolean(perms?.canManageSettings);

  const navItems = [
    {
      section: "الرئيسية",
      items: [
        { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, visible: true },
      ],
    },
    {
      section: "العمليات",
      items: [
        { href: "/cases", label: "الحالات", icon: FolderOpen, visible: canViewCases },
        { href: "/doctors", label: "الأطباء", icon: Stethoscope, visible: canViewDoctors },
        { href: "/couriers", label: "المندوبون والتحصيل", icon: UserCheck, visible: canViewCouriers },
        { href: "/appointments", label: "المواعيد", icon: Calendar, visible: canViewAppointments },
      ],
    },
    {
      section: "المالية",
      items: [
        { href: "/finance", label: "الملخص المالي", icon: Wallet, visible: canViewFinance },
        { href: "/expenses", label: "المصروفات", icon: Receipt, visible: canManageExpenses || canViewFinance },
      ],
    },
    {
      section: "الإدارة",
      items: [
        { href: "/employees", label: "الموظفون", icon: Users, visible: canViewEmployees },
        { href: "/products", label: "أنواع التركيبات", icon: Package, visible: canViewProducts },
        { href: "/reports", label: "التقارير", icon: BarChart3, visible: canViewReports },
        { href: "/settings", label: "الإعدادات", icon: Settings, visible: canManageSettings },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768 && onClose) onClose();
  };

  return (
    <aside
      className={cn(
        "sidebar",
        isOpen && "sidebar-open"
      )}
    >
      {/* Logo + mobile close button */}
      <div
        className="flex items-center justify-between p-4 mb-2"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <Image
          src="/logo-transparent.png"
          alt="Logo"
          width={200}
          height={130}
          className="h-20 w-auto object-contain flex-1"
          priority
        />
        {/* Close button — only visible on mobile */}
        <button
          onClick={onClose}
          className="mobile-only btn-icon shrink-0"
          aria-label="إغلاق القائمة"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav list */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((section) => {
          const visibleItems = section.items.filter(i => i.visible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.section} className="mb-4">
              <p
                className="px-5 py-1 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-ink-subtle)" }}
              >
                {section.section}
              </p>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn("sidebar-nav-item", active && "active")}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Logout & Developer Credits */}
      <div
        className="p-4 flex flex-col gap-3"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <button
          id="sidebar-logout"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="sidebar-nav-item w-full text-red-600 hover:!bg-red-50"
          style={{ margin: 0 }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>تسجيل الخروج</span>
        </button>

        <div className="text-center pt-1">
          <a
            href="https://hassansamhan.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[11px] text-zinc-400 hover:text-blue-600 transition-colors font-mono tracking-wide"
            dir="ltr"
          >
            developed by hassan samhan
          </a>
        </div>
      </div>
    </aside>
  );
}

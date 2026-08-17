"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Download } from "lucide-react";

export function CasesHeaderActions() {
  const { data: session } = useSession();

  const perms = session?.user?.permissions;
  const isSuperOrAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canEditCases = isSuperOrAdmin || (perms?.canEditCases ?? true);

  return (
    <div className="flex items-center gap-2">
      <button id="export-cases" onClick={() => window.print()} className="btn btn-ghost btn-sm">
        <Download className="w-4 h-4" />
        تصدير / طباعة
      </button>
      {canEditCases && (
        <Link href="/cases/new" className="btn btn-primary btn-sm">
          <Plus className="w-4 h-4" />
          حالة جديدة
        </Link>
      )}
    </div>
  );
}

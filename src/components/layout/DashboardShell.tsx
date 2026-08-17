"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change / resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="flex min-h-screen" dir="rtl">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main content ── */}
      <main
        className="flex-1 flex flex-col min-w-0 dashboard-main"
      >
        {/* Pass toggle to children via context substitute: clone children */}
        {typeof children === "object" && children !== null
          ? injectToggle(children, () => setSidebarOpen((o) => !o))
          : children}
      </main>
    </div>
  );
}

// Inject onMenuToggle prop into the first child that accepts it (the page wrapper)
function injectToggle(children: React.ReactNode, toggle: () => void): React.ReactNode {
  return (
    <DashboardContext.Provider value={{ onMenuToggle: toggle }}>
      {children}
    </DashboardContext.Provider>
  );
}

import { createContext, useContext } from "react";

interface DashboardContextType {
  onMenuToggle: () => void;
}

const DashboardContext = createContext<DashboardContextType>({
  onMenuToggle: () => {},
});

export function useDashboard() {
  return useContext(DashboardContext);
}

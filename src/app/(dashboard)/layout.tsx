import { auth, defaultDemoSession } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    session = await auth();
  } catch {
    // fallback
  }

  const activeSession = session || defaultDemoSession;
 
  return (
    <SessionProvider session={activeSession}>
      <DashboardShell>{children}</DashboardShell>
    </SessionProvider>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "system-ui, sans-serif",
        color: "#334155",
      }}
    >
      جارٍ الدخول إلى لوحة التحكم مباشرة...
    </div>
  );
}


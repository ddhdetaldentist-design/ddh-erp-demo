"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import Image from "next/image";
import { Loader2, ShieldCheck, UserCheck, Sparkles, KeyRound, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

const DEMO_ACCOUNTS = [
  {
    role: "مدير النظام (Super Admin)",
    email: "admin@ddh.demo",
    name: "د. أحمد سامي",
    icon: "👑",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    desc: "صلاحيات كاملة وغير مقيدة",
  },
  {
    role: "مدير المعمل (Manager)",
    email: "manager@ddh.demo",
    name: "م. طارق محمود",
    icon: "💼",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    desc: "إدارة الحالات والمناديب والعمليات",
  },
  {
    role: "فني CAD/CAM (Tech)",
    email: "tech@ddh.demo",
    name: "إسلام حسن",
    icon: "🔬",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    desc: "متابعة مراحل الإنتاج والبروفات",
  },
  {
    role: "محاسب المعمل (Accountant)",
    email: "accountant@ddh.demo",
    name: "سارة خالد",
    icon: "💰",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    desc: "إدارة الخزن والمصروفات والتحصيل",
  },
  {
    role: "زائر للعرض (Viewer)",
    email: "viewer@ddh.demo",
    name: "زائر تجريبي",
    icon: "👁️",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    desc: "عرض جميع الشاشات (قراءة فقط)",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@ddh.demo");
  const [password, setPassword] = useState("demo123456");
  const [loading, setLoading] = useState(false);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [error, setError] = useState("");

  const executeLogin = async (targetEmail: string, targetPass: string) => {
    setError("");
    const result = loginSchema.safeParse({ email: targetEmail, password: targetPass });
    if (!result.success) {
      setError(result.error.issues[0]?.message || "بيانات غير صحيحة");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: targetEmail,
        password: targetPass,
        redirect: false,
      });

      if (res?.error) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const handleQuickLogin = async (accEmail: string) => {
    setEmail(accEmail);
    setPassword("demo123456");
    setActiveAccount(accEmail);
    await executeLogin(accEmail, "demo123456");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: "12px", textAlign: "center" }}>
          <Image
            src="/logo-transparent.png"
            alt="DDH Dental Logo"
            width={240}
            height={90}
            style={{ height: "160px", width: "auto", objectFit: "contain" }}
            priority
          />
        </div>

        {/* Demo Mode Announcement Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
            borderRadius: "9999px",
            padding: "6px 16px",
            fontSize: "13px",
            fontWeight: 700,
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.08)",
          }}
        >
          <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>نسخة تجريبية تفاعلية بالكامل (Interactive Demo)</span>
        </div>

        {/* Main Card */}
        <div
          style={{
            width: "100%",
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "32px",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)",
            boxSizing: "border-box",
          }}
        >
          {/* Header Titles */}
          <div style={{ marginBottom: "24px", textAlign: "right" }}>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 6px 0",
                lineHeight: 1.2,
              }}
            >
              مرحباً بك في نظام DDH
            </h1>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#64748b",
                margin: 0,
              }}
            >
              اختر دوراً تجريبياً للدخول الفوري بنقرة واحدة أو أدخل البيانات يدوياً
            </p>
          </div>

          {/* Quick Demo Login Cards */}
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                دخول تجريبي سريع بنقرة واحدة:
              </span>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                كلمة المرور: <strong className="text-slate-700">demo123456</strong>
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {DEMO_ACCOUNTS.map((acc) => {
                const isThisLoading = loading && activeAccount === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleQuickLogin(acc.email)}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                      cursor: loading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                      textAlign: "right",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "#f1f5f9";
                        e.currentTarget.style.borderColor = "#93c5fd";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "20px" }}>{acc.icon}</span>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                          {acc.role}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {acc.name} · {acc.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {isThisLoading ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      ) : (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#2563eb",
                            backgroundColor: "#eff6ff",
                            padding: "3px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          دخول سريع ←
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              textAlign: "center",
              margin: "24px 0",
            }}
          >
            <div style={{ height: "1px", backgroundColor: "#e2e8f0" }} />
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "#ffffff",
                padding: "0 12px",
                fontSize: "12px",
                color: "#94a3b8",
                fontWeight: 600,
              }}
            >
              أو تسجيل الدخول العادي
            </span>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#dc2626",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                marginBottom: "20px",
                textAlign: "right",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: "14px", textAlign: "right" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ddh.demo"
                style={{
                  width: "100%",
                  height: "44px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "0 14px",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                  direction: "ltr",
                  textAlign: "right",
                }}
                autoComplete="email"
                required
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: "20px", textAlign: "right" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo123456"
                style={{
                  width: "100%",
                  height: "44px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "0 14px",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                  direction: "ltr",
                  textAlign: "right",
                }}
                autoComplete="current-password"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: "46px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "15px",
                borderRadius: "10px",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background-color 0.15s",
              }}
            >
              {loading && !activeAccount ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جارٍ تسجيل الدخول...
                </>
              ) : (
                "تسجيل الدخول للنظام"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "20px",
            fontSize: "12px",
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          <a
            href="https://hassansamhan.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#94a3b8",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#2563eb")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            developed by hassan samhan
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { z } from "zod";
import Image from "next/image";
import { Loader2, ShieldCheck, Building2, Wrench, Calculator, UserCheck, KeyRound } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

const DEMO_ACCOUNTS = [
  {
    role: "مدير النظام (Super Admin)",
    email: "admin@ddh.demo",
    name: "د. أحمد سامي",
    icon: ShieldCheck,
    color: "#7c3aed",
    desc: "صلاحيات كاملة وغير مقيدة",
  },
  {
    role: "مدير المعمل (Manager)",
    email: "manager@ddh.demo",
    name: "م. طارق محمود",
    icon: Building2,
    color: "#2563eb",
    desc: "إدارة الحالات والمناديب والعمليات",
  },
  {
    role: "فني CAD/CAM (Tech)",
    email: "tech@ddh.demo",
    name: "إسلام حسن",
    icon: Wrench,
    color: "#0d9488",
    desc: "متابعة مراحل الإنتاج والبروفات",
  },
  {
    role: "محاسب المعمل (Accountant)",
    email: "accountant@ddh.demo",
    name: "سارة خالد",
    icon: Calculator,
    color: "#059669",
    desc: "إدارة الخزن والمصروفات والتحصيل",
  },
  {
    role: "زائر للعرض (Viewer)",
    email: "viewer@ddh.demo",
    name: "زائر تجريبي",
    icon: UserCheck,
    color: "#d97706",
    desc: "عرض جميع الشاشات (قراءة فقط)",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("admin@ddh.demo");
  const [password, setPassword] = useState("demo123456");
  const [loading, setLoading] = useState(false);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [error, setError] = useState("");

  const executeLogin = async (targetEmail: string, targetPass: string) => {
    setError("");
    const cleanEmail = targetEmail.trim().toLowerCase();
    const cleanPass = targetPass.trim();

    const result = loginSchema.safeParse({ email: cleanEmail, password: cleanPass });
    if (!result.success) {
      setError(result.error.issues[0]?.message || "بيانات غير صحيحة");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: cleanEmail,
        password: cleanPass,
        redirect: false,
      });

      if (!res || res.error) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        setLoading(false);
      } else {
        // Successful login: perform full navigation to establish session cookie immediately
        window.location.href = "/";
      }
    } catch {
      // In case of automatic redirect or fetch error
      window.location.href = "/";
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
          maxWidth: "480px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: "10px", textAlign: "center" }}>
          <Image
            src="/logo-transparent.png"
            alt="DDH Dental Logo"
            width={220}
            height={80}
            style={{ height: "150px", width: "auto", objectFit: "contain" }}
            priority
          />
        </div>

        {/* Main Card */}
        <div
          style={{
            width: "100%",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "28px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
            boxSizing: "border-box",
          }}
        >
          {/* Header Titles */}
          <div style={{ marginBottom: "20px", textAlign: "right" }}>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 4px 0",
                lineHeight: 1.2,
              }}
            >
              تسجيل الدخول — معمل DDH
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                margin: 0,
              }}
            >
              اختر حساباً للدخول السريع أو أدخل البريد وكلمة المرور
            </p>
          </div>

          {/* Quick Demo Login Cards */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                دخول سريع بنقرة واحدة:
              </span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                كلمة المرور: <strong className="text-slate-800">demo123456</strong>
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {DEMO_ACCOUNTS.map((acc) => {
                const IconComponent = acc.icon;
                const isThisLoading = loading && activeAccount === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleQuickLogin(acc.email)}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "10px",
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
                        e.currentTarget.style.borderColor = "#cbd5e1";
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
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: acc.color,
                          flexShrink: 0,
                        }}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                          {acc.role}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {acc.name} · {acc.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center" }}>
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
                          دخول ←
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
              margin: "20px 0",
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
                padding: "0 10px",
                fontSize: "11px",
                color: "#94a3b8",
                fontWeight: 600,
              }}
            >
              أو كتابة البيانات
            </span>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#dc2626",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                marginBottom: "16px",
                textAlign: "right",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: "12px", textAlign: "right" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "4px",
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
                  height: "42px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "0 12px",
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
            <div style={{ marginBottom: "18px", textAlign: "right" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "4px",
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
                  height: "42px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "0 12px",
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
                height: "44px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "15px",
                borderRadius: "8px",
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
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جارٍ تسجيل الدخول...
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "16px",
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

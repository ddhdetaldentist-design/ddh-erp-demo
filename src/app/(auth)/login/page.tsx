"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Loader2, Sparkles, KeyRound, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@ddh.demo");
  const [password, setPassword] = useState("demo123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const executeLogin = async (targetEmail: string, targetPass: string) => {
    setError("");
    const cleanEmail = targetEmail.trim();
    const cleanPass = targetPass.trim();

    if (!cleanEmail) {
      setError("يرجى إدخال البريد الإلكتروني");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: cleanEmail,
        password: cleanPass || "demo123456",
        redirect: false,
        redirectTo: "/",
      });

      if (res?.error) {
        setError("تعذر تسجيل الدخول. يمكنك الضغط على 'دخول فوري كـ مستخدم تجريبي' بالأسفل.");
        setLoading(false);
      } else {
        // Successful login: perform full navigation to load dashboard
        window.location.href = "/";
      }
    } catch {
      // In case of automatic Next.js redirect or fetch handler
      window.location.href = "/";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const handleQuickDemoLogin = async () => {
    setEmail("demo@ddh.demo");
    setPassword("demo123456");
    await executeLogin("demo@ddh.demo", "demo123456");
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
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: "16px", textAlign: "center" }}>
          <Image
            src="/logo-transparent.png"
            alt="DDH Dental Logo"
            width={240}
            height={90}
            style={{ height: "130px", width: "auto", objectFit: "contain" }}
            priority
          />
        </div>

        {/* Main Card */}
        <div
          style={{
            width: "100%",
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "32px 28px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "24px", textAlign: "right" }}>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 6px 0",
                lineHeight: 1.3,
              }}
            >
              تسجيل الدخول — معمل DDH
            </h1>
            <p
              style={{
                fontSize: "13.5px",
                color: "#64748b",
                margin: 0,
              }}
            >
              نظام إدارة معامل الأسنان الرقمي (النسخة التجريبية)
            </p>
          </div>

          {/* ⚡ ONE-CLICK DEMO LOGIN HERO BUTTON */}
          <div style={{ marginBottom: "24px" }}>
            <button
              type="button"
              id="quick-demo-login-btn"
              onClick={handleQuickDemoLogin}
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px 18px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)",
                border: "none",
                color: "#ffffff",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(37, 99, 235, 0.45)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(37, 99, 235, 0.35)";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "right" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "-0.2px" }}>
                    دخول مباشر بالحساب التجريبي
                  </div>
                  <div style={{ fontSize: "12px", color: "#bfdbfe", marginTop: "2px" }}>
                    استعراض كامل لجميع الشاشات والتقارير بنقرة واحدة
                  </div>
                </div>
              </div>

              <div>
                {loading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(255, 255, 255, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Demo User Info Badge */}
          <div
            style={{
              backgroundColor: "#f1f5f9",
              borderRadius: "12px",
              padding: "12px 14px",
              marginBottom: "22px",
              border: "1px solid #e2e8f0",
              textAlign: "right",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                بيانات الحساب التجريبي المعتمد:
              </span>
              <span
                style={{
                  fontSize: "11px",
                  backgroundColor: "#dcfce7",
                  color: "#166534",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontWeight: 700,
                }}
              >
                صلاحية كاملة
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>
              <div>👤 <strong>البريد:</strong> <code style={{ color: "#1e40af", fontWeight: 700 }}>demo@ddh.demo</code></div>
              <div>🔑 <strong>كلمة المرور:</strong> <code style={{ color: "#1e40af", fontWeight: 700 }}>demo123456</code></div>
              <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                يفتح كل الأقسام: الحالات، الأطباء، المناديب، المالية، التقارير والإعدادات.
              </div>
            </div>
          </div>

          {/* Divider */}
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
                padding: "0 12px",
                fontSize: "12px",
                color: "#94a3b8",
                fontWeight: 600,
              }}
            >
              أو تسجيل الدخول اليدوي
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
            <div style={{ marginBottom: "14px", textAlign: "right" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "5px",
                }}
              >
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@ddh.demo"
                style={{
                  width: "100%",
                  height: "44px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "0 12px",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                  direction: "ltr",
                  textAlign: "right",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
                autoComplete="email"
                required
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: "20px", textAlign: "right" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "5px",
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
                  padding: "0 12px",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                  direction: "ltr",
                  textAlign: "right",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
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
                backgroundColor: "#0f172a",
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
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#1e293b";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#0f172a";
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جارٍ تسجيل الدخول...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  دخول بالنظام
                </>
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


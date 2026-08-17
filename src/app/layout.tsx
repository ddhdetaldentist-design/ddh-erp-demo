import type { Metadata } from "next";
import { Cairo, IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// ─── Arabic Display Font (Headlines) ─────────────────────
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

// ─── Arabic UI Font (Body / Tables) ──────────────────────
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-ibm-plex",
  display: "swap",
});

// ─── Monospace (Codes / Numbers) ─────────────────────────
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DDH Dental Lab | نظام إدارة العياده",
    template: "%s | DDH",
  },
  description: "نظام ERP متكامل لعياده أسنان DDH — إدارة الحالات، الأطباء، المالية، والمواعيد",
  keywords: ["عياده أسنان", "dental lab", "ERP", "DDH", "إدارة الحالات"],
  robots: "noindex, nofollow", // internal system
  icons: {
    icon: "/logo-transparent.png",
    shortcut: "/logo-transparent.png",
    apple: "/logo-transparent.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} ${ibmPlexSansArabic.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning className="font-ibm antialiased bg-canvas text-ink min-h-screen">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          toastOptions={{
            style: {
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-ink)",
            },
          }}
        />
      </body>
    </html>
  );
}

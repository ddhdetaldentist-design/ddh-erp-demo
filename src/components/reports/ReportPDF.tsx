"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image as PDFImage,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";

// ─── Register Cairo Arabic Font ────────────────────────────────────────
Font.register({
  family: "Cairo",
  fonts: [
    { src: "/fonts/Cairo-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/Cairo-Bold.ttf", fontWeight: "bold" },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

// ─── Helpers ───────────────────────────────────────────────────────────
function fmtAmount(amount: number): string {
  return `${amount.toLocaleString("en-US")} جم`;
}

function fmtDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
}

const MONTH_NAMES = [
  "", "يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو",
  "يوليو", "اغسطس", "سبتمبر", "اكتوبر", "نوفمبر", "ديسمبر",
];

// ─── Types ─────────────────────────────────────────────────────────────
interface CaseItem {
  id: string;
  caseCode: string;
  patientName: string;
  totalAmount: number;
  collected: number;
  remaining: number;
  status: string;
  units: number;
  receivedAt: Date;
  doctor: { name: string };
  productType: { name: string };
}

interface Expense {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
}

export interface ReportPDFProps {
  cases: CaseItem[];
  expenses: Expense[];
  month: number;
  year: number;
  totalSales: number;
  totalCollected: number;
  totalRemaining: number;
  totalExpenses: number;
  netProfit: number;
  doctorName?: string;
  logoUrl?: string;
}

// ─── Styles (Simple & Clean Soft Accents) ─────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Cairo",
    fontSize: 9,
    backgroundColor: "#ffffff",
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 28,
    direction: "rtl",
  },

  // ── Header
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: "1 solid #e5e7eb",
  },
  headerRight: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 55,
    height: 55,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 15,
    fontFamily: "Cairo",
    fontWeight: "bold",
    color: "#111827",
  },
  headerLeft: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  reportTitle: {
    fontSize: 12,
    fontFamily: "Cairo",
    fontWeight: "bold",
    color: "#111827",
  },
  reportSubtitle: {
    fontSize: 8.5,
    fontFamily: "Cairo",
    color: "#4b5563",
    marginTop: 2,
  },

  // ── Section Title
  sectionTitle: {
    fontFamily: "Cairo",
    fontWeight: "bold",
    fontSize: 10,
    color: "#111827",
    textAlign: "right",
    marginBottom: 6,
  },

  // ── Table (Soft Borders & Light Gray Headers)
  table: {
    marginBottom: 16,
    border: "1 solid #d1d5db",
    borderRadius: 2,
  },
  tableHeader: {
    flexDirection: "row-reverse",
    borderBottom: "1 solid #d1d5db",
    backgroundColor: "#f9fafb",
    paddingVertical: 5,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 5,
    backgroundColor: "#ffffff",
  },
  tableRowAlt: {
    flexDirection: "row-reverse",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 5,
    backgroundColor: "#fafafa",
  },
  th: {
    fontFamily: "Cairo",
    fontWeight: "bold",
    fontSize: 8,
    color: "#1f2937",
    textAlign: "center",
    borderLeft: "1 solid #e5e7eb",
  },
  td: {
    fontFamily: "Cairo",
    fontSize: 8,
    color: "#374151",
    textAlign: "center",
    borderLeft: "1 solid #e5e7eb",
  },
  tdLast: {
    borderLeft: "0 solid #e5e7eb",
  },

  // Column widths (cases table)
  colCode:      { width: "9%" },
  colDate:      { width: "10%" },
  colDoctor:    { width: "16%" },
  colPatient:   { width: "17%" },
  colProduct:   { width: "15%" },
  colUnits:     { width: "7%" },
  colTotal:     { width: "9%" },
  colCollected: { width: "9%" },
  colRemaining: { width: "8%" },

  // Summary row
  tableSummary: {
    flexDirection: "row-reverse",
    paddingVertical: 5,
    backgroundColor: "#f9fafb",
    borderTop: "1 solid #d1d5db",
  },
  summaryLabel: {
    fontFamily: "Cairo",
    fontWeight: "bold",
    fontSize: 8.5,
    color: "#111827",
    textAlign: "right",
    flex: 1,
    paddingRight: 6,
  },
  summaryValue: {
    fontFamily: "Cairo",
    fontWeight: "bold",
    fontSize: 8.5,
    color: "#111827",
    textAlign: "center",
  },

  // ── Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "0.5 solid #e5e7eb",
    paddingTop: 4,
  },
  footerText: {
    fontFamily: "Cairo",
    fontSize: 7.5,
    color: "#6b7280",
  },
});

// ─── PDF Document ──────────────────────────────────────────────────────
function ReportDocument({
  cases,
  expenses,
  month,
  year,
  totalSales,
  totalCollected,
  totalRemaining,
  totalExpenses,
  netProfit,
  doctorName,
  logoUrl,
}: ReportPDFProps) {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const generatedAt = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const periodLabel = month === 0
    ? `كل شهور ${year}`
    : `${MONTH_NAMES[month]} ${year}`;

  const reportTitle = doctorName
    ? `كشف حساب: د. ${doctorName}`
    : `التقرير المالي الشهري`;

  const validCases = Array.isArray(cases) ? cases.filter(Boolean) : [];

  return (
    <Document title={`DDH - ${reportTitle} - ${periodLabel}`} author="DDH Dental Lab">
      <Page size="A4" style={s.page} orientation="landscape">

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerRight}>
            {logoUrl && <PDFImage src={logoUrl} style={s.logo} />}
            <Text style={s.companyName}>معمل اسنان DDH</Text>
          </View>
          <View style={s.headerLeft}>
            <Text style={s.reportTitle}>{reportTitle}</Text>
            <Text style={s.reportSubtitle}>الفترة: {periodLabel} | تاريخ الطباعة: {generatedAt}</Text>
          </View>
        </View>

        {/* ── Cases Table ── */}
        <Text style={s.sectionTitle}>بيانات الحالات ({validCases.length} حالة)</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.th, s.colCode]}>الكود</Text>
            <Text style={[s.th, s.colDate]}>التاريخ</Text>
            <Text style={[s.th, s.colDoctor]}>الدكتور</Text>
            <Text style={[s.th, s.colPatient]}>المريض</Text>
            <Text style={[s.th, s.colProduct]}>التركيبة</Text>
            <Text style={[s.th, s.colUnits]}>العدد</Text>
            <Text style={[s.th, s.colTotal]}>الاجمالي</Text>
            <Text style={[s.th, s.colCollected]}>المحصل</Text>
            <Text style={[s.th, s.colRemaining, s.tdLast]}>المتبقي</Text>
          </View>

          {validCases.map((c, i) => (
            <View key={c?.id || `case-${i}`} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.td, s.colCode]}>#{c?.caseCode || "-"}</Text>
              <Text style={[s.td, s.colDate]}>{fmtDate(c?.receivedAt)}</Text>
              <Text style={[s.td, s.colDoctor]}>{c?.doctor?.name || "-"}</Text>
              <Text style={[s.td, s.colPatient]}>{c?.patientName || "-"}</Text>
              <Text style={[s.td, s.colProduct]}>{c?.productType?.name || "-"}</Text>
              <Text style={[s.td, s.colUnits]}>{c?.units || 1}</Text>
              <Text style={[s.td, s.colTotal]}>{fmtAmount(c?.totalAmount || 0)}</Text>
              <Text style={[s.td, s.colCollected]}>{fmtAmount(c?.collected || 0)}</Text>
              <Text style={[s.td, s.colRemaining, s.tdLast]}>{fmtAmount(c?.remaining || 0)}</Text>
            </View>
          ))}


          {cases.length > 0 && (
            <View style={s.tableSummary}>
              <Text style={s.summaryLabel}>الاجمالي الكلي</Text>
              <Text style={[s.summaryValue, s.colTotal]}>{fmtAmount(totalSales)}</Text>
              <Text style={[s.summaryValue, s.colCollected]}>{fmtAmount(totalCollected)}</Text>
              <Text style={[s.summaryValue, s.colRemaining]}>{fmtAmount(totalRemaining)}</Text>
            </View>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{generatedAt} • {cases.length} حالة • {periodLabel}</Text>
          <Text style={s.footerText}>DDH Dental Lab</Text>
        </View>

      </Page>
    </Document>
  );
}

async function getBase64ImageFromUrl(imageUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

// ─── Download Helper ───────────────────────────────────────────────────
export async function downloadReportPDF(props: ReportPDFProps) {
  const { month, year, doctorName } = props;
  const monthLabel = month === 0 ? `all_${year}` : `${MONTH_NAMES[month]}_${year}`;
  const fileName = doctorName
    ? `DDH_كشف_حساب_${doctorName}_${monthLabel}.pdf`
    : `DDH_تقرير_شهري_${monthLabel}.pdf`;

  let logoBase64: string | undefined = undefined;
  if (typeof window !== "undefined") {
    logoBase64 = await getBase64ImageFromUrl(`${window.location.origin}/logo-transparent.png`);
  }

  try {
    const blob = await pdf(<ReportDocument {...props} logoUrl={logoBase64} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("PDF generation failed, retrying without logo:", err);
    const blob = await pdf(<ReportDocument {...props} logoUrl={undefined} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}

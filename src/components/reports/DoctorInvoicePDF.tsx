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
    { src: "/fonts/Cairo-Bold.ttf",    fontWeight: "bold"   },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

// ─── Helpers ───────────────────────────────────────────────────────────
function fmtMoney(n: number | undefined | null): string {
  const val = typeof n === "number" && !isNaN(n) ? n : 0;
  return `${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function numberToArabicWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return "صفر";
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
    "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر",
    "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة"];
  const thousands = ["", "ألف", "ألفان", "ثلاثة آلاف", "أربعة آلاف", "خمسة آلاف",
    "ستة آلاف", "سبعة آلاف", "ثمانية آلاف", "تسعة آلاف", "عشرة آلاف"];

  const integer = Math.floor(Math.abs(num));

  if (integer < 20) return ones[integer] || "";
  if (integer < 100) {
    const t = Math.floor(integer / 10);
    const o = integer % 10;
    return o === 0 ? tens[t] : `${ones[o]} و${tens[t]}`;
  }
  if (integer < 1000) {
    const h = Math.floor(integer / 100);
    const rest = integer % 100;
    return rest === 0 ? hundreds[h] : `${hundreds[h]} و${numberToArabicWords(rest)}`;
  }
  if (integer < 11000) {
    const th = Math.floor(integer / 1000);
    const rest = integer % 1000;
    const thStr = th < thousands.length ? thousands[th] : `${numberToArabicWords(th)} آلاف`;
    return rest === 0 ? thStr : `${thStr} و${numberToArabicWords(rest)}`;
  }
  return integer.toLocaleString("en-US");
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

// ─── Types ─────────────────────────────────────────────────────────────
export interface InvoiceCaseItem {
  id: string;
  patientName: string;
  totalAmount: number;
  units: number;
  pricePerUnit: number;
  color: string | null;
  productType?: { name: string } | null;
}

export interface DoctorInvoiceProps {
  doctorName: string;
  clinicName?: string | null;
  area?: string | null;
  cases?: InvoiceCaseItem[];
  month: number;
  year: number;
  totalRemaining: number;
  logoUrl?: string;
}

// ─── Styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Cairo",
    fontSize: 10,
    backgroundColor: "#ffffff",
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 35,
    direction: "rtl",
  },

  // ── Top Header
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logoBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 65,
    height: 65,
    objectFit: "contain",
  },
  labName: {
    fontFamily: "Cairo",
    fontWeight: "bold",
    fontSize: 15,
    color: "#111827",
    textAlign: "right",
  },

  // ── Doctor Info Row
  infoRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: "1 solid #e5e7eb",
  },
  infoGroup: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  infoLabel: {
    fontFamily: "Cairo",
    fontWeight: "bold",
    fontSize: 11,
    color: "#111827",
  },
  infoValue: {
    fontFamily: "Cairo",
    fontSize: 11,
    color: "#374151",
  },

  // ── Table
  table: {
    marginBottom: 20,
    border: "1 solid #d1d5db",
    borderRadius: 2,
  },
  tableHeader: {
    flexDirection: "row-reverse",
    borderBottom: "1 solid #d1d5db",
    backgroundColor: "#f9fafb",
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 6,
    backgroundColor: "#ffffff",
  },
  tableRowAlt: {
    flexDirection: "row-reverse",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 6,
    backgroundColor: "#fafafa",
  },
  th: {
    fontFamily: "Cairo",
    fontWeight: "bold",
    fontSize: 9.5,
    color: "#1f2937",
    textAlign: "center",
    borderLeft: "1 solid #e5e7eb",
  },
  td: {
    fontFamily: "Cairo",
    fontSize: 9.5,
    color: "#374151",
    textAlign: "center",
    borderLeft: "1 solid #e5e7eb",
  },
  tdLast: {
    borderLeft: "0 solid #e5e7eb",
  },

  // Column widths
  colNum:     { width: "5%"  },
  colType:    { width: "15%" },
  colTeeth:   { width: "20%" },
  colUnits:   { width: "10%" },
  colPatient: { width: "22%" },
  colPrice:   { width: "14%" },
  colValue:   { width: "14%" },

  // ── Total section
  totalContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    border: "1 solid #e5e7eb",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  totalLabel: {
    fontFamily: "Cairo",
    fontWeight: "bold",
    fontSize: 13,
    color: "#111827",
  },
  totalAmount: {
    fontFamily: "Cairo",
    fontWeight: "bold",
    fontSize: 14,
    color: "#111827",
  },
  totalWords: {
    fontFamily: "Cairo",
    fontSize: 12,
    color: "#4b5563",
  },

  // ── Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 35,
    right: 35,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "0.5 solid #e5e7eb",
    paddingTop: 6,
  },
  footerText: {
    fontFamily: "Cairo",
    fontSize: 8,
    color: "#6b7280",
  },
});

// ─── Document Component ────────────────────────────────────────────────
function DoctorInvoiceDocument({
  doctorName = "",
  clinicName,
  area,
  cases = [],
  totalRemaining = 0,
  logoUrl,
}: DoctorInvoiceProps) {
  const now = new Date();
  const statementDate = `${now.getFullYear()} / ${now.getMonth() + 1} / ${now.getDate()}`;
  const amountWords = numberToArabicWords(Math.round(totalRemaining || 0));

  const validCases = Array.isArray(cases) ? cases.filter(Boolean) : [];

  return (
    <Document title={`كشف حساب - د. ${doctorName}`} author="DDH Dental Lab">
      <Page size="A4" style={s.page} orientation="portrait">

        {/* ── Header ── */}
        <View style={s.headerRow}>
          <View style={s.logoBox}>
            {logoUrl ? (
              <PDFImage src={logoUrl} style={s.logo} />
            ) : null}
            <Text style={s.labName}>معمل اسنان DDH</Text>
          </View>
        </View>

        {/* ── Doctor & Date Info ── */}
        <View style={s.infoRow}>
          <View style={s.infoGroup}>
            <Text style={s.infoLabel}>: الدكتور </Text>
            <Text style={s.infoValue}>{doctorName}</Text>
            {/* {(clinicName || area) && (
              <Text style={[s.infoValue, { color: "#6b7280" }]}>
                {clinicName ? ` (${clinicName})` : ""}{area ? ` - ${area}` : ""}
              </Text>
            )} */}
          </View>
          <View style={s.infoGroup}>
            <Text style={s.infoLabel}>: تاريخ البيان </Text>
            <Text style={s.infoValue}>{statementDate}</Text>
          </View>
        </View>

        {/* ── Cases Table ── */}
        <View style={s.table}>
          {/* Header */}
          <View style={s.tableHeader}>
            <Text style={[s.th, s.colNum]}>م</Text>
            <Text style={[s.th, s.colType]}>التركيبة</Text>
            <Text style={[s.th, s.colTeeth]}>الاسنان / اللون</Text>
            <Text style={[s.th, s.colUnits]}>العدد</Text>
            <Text style={[s.th, s.colPatient]}>المريض</Text>
            <Text style={[s.th, s.colPrice]}>السعر</Text>
            <Text style={[s.th, s.colValue, s.tdLast]}>القيمة</Text>
          </View>

          {/* Table Rows */}
          {validCases.map((c, i) => (
            <View key={c?.id || `case-${i}`} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.td, s.colNum]}>{i + 1}</Text>
              <Text style={[s.td, s.colType]}>{c?.productType?.name || "-"}</Text>
              <Text style={[s.td, s.colTeeth]}>{c?.color || "-"}</Text>
              <Text style={[s.td, s.colUnits]}>{c?.units || 1}</Text>
              <Text style={[s.td, s.colPatient]}>{c?.patientName || "-"}</Text>
              <Text style={[s.td, s.colPrice]}>EGP {fmtMoney(c?.pricePerUnit)}</Text>
              <Text style={[s.td, s.colValue, s.tdLast]}>EGP {fmtMoney(c?.totalAmount)}</Text>
            </View>
          ))}
        </View>

        {/* ── Total Required Section ── */}
        <View style={s.totalContainer}>
          <Text style={s.totalLabel}>: الاجمالي المطلوب </Text>
          <Text style={s.totalAmount}>{(totalRemaining || 0).toLocaleString("en-US")} ج</Text>
          <Text style={s.totalWords}>فقط {amountWords} ج لا غير</Text>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{statementDate} • {validCases.length} حالة</Text>
          <Text style={s.footerText}>DDH Dental Lab</Text>
        </View>

      </Page>
    </Document>
  );
}

// ─── Download Helper ───────────────────────────────────────────────────
export async function downloadDoctorInvoicePDF(props: DoctorInvoiceProps) {
  let logoBase64: string | undefined = undefined;
  if (typeof window !== "undefined") {
    logoBase64 = await getBase64ImageFromUrl(`${window.location.origin}/logo-transparent.png`);
  }

  try {
    const blob = await pdf(
      <DoctorInvoiceDocument {...props} logoUrl={logoBase64} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DDH_كشف_حساب_${props.doctorName || "طبيب"}_${props.month || 0}_${props.year || 2026}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("PDF generation failed, retrying without logo:", err);
    const blob = await pdf(
      <DoctorInvoiceDocument {...props} logoUrl={undefined} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DDH_كشف_حساب_${props.doctorName || "طبيب"}_${props.month || 0}_${props.year || 2026}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

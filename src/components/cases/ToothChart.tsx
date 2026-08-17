"use client";

import { useCallback } from "react";

// FDI: upper row left→right (18→11 | 21→28), lower row left→right (48→41 | 31→38)
const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// Parabolic arch curve offset
function archOffset(i: number, total: number, maxPx: number): number {
  const center = (total - 1) / 2;
  const t = Math.abs(i - center) / center;
  return Math.round(maxPx * t * t);
}

// Tooth dimensions & shape per FDI type (1=central incisor … 8=wisdom)
interface ToothShape { w: number; h: number; br: string }

function getShape(num: number, isUpper: boolean): ToothShape {
  const t = num % 10;
  // [width, height]
  const sizes: Record<number, [number, number]> = {
    1: [20, 38], 2: [16, 34], 3: [14, 40],
    4: [18, 30], 5: [18, 28], 6: [24, 26],
    7: [22, 24], 8: [18, 22],
  };
  const [w, h] = sizes[t] ?? [18, 28];

  // CSS border-radius: creates tooth crown shape
  // Upper: rounded at gumline (top), pointed/square at occlusal edge (bottom)
  // Lower: mirror
  const brs: Record<number, [string, string]> = {
    //            upper                         lower
    1: ["46% 46% 12% 12% / 52% 52% 16% 16%", "12% 12% 46% 46% / 16% 16% 52% 52%"],
    2: ["44% 44% 14% 14% / 50% 50% 18% 18%", "14% 14% 44% 44% / 18% 18% 50% 50%"],
    3: ["44% 44% 44% 44% / 52% 52% 58% 58%", "44% 44% 44% 44% / 58% 58% 52% 52%"],
    4: ["40% 40% 18% 18% / 46% 46% 22% 22%", "18% 18% 40% 40% / 22% 22% 46% 46%"],
    5: ["38% 38% 18% 18% / 44% 44% 22% 22%", "18% 18% 38% 38% / 22% 22% 44% 44%"],
    6: ["32% 32% 10% 10% / 38% 38% 14% 14%", "10% 10% 32% 32% / 14% 14% 38% 38%"],
    7: ["30% 30% 10% 10% / 36% 36% 14% 14%", "10% 10% 30% 30% / 14% 14% 36% 36%"],
    8: ["28% 28% 10% 10% / 34% 34% 14% 14%", "10% 10% 28% 28% / 14% 14% 34% 34%"],
  };
  const [brUpper, brLower] = brs[t] ?? ["20%", "20%"];
  return { w, h, br: isUpper ? brUpper : brLower };
}

interface ToothBtnProps {
  num: number;
  selected: boolean;
  isUpper: boolean;
  onToggle: (n: number) => void;
}

function ToothBtn({ num, selected, isUpper, onToggle }: ToothBtnProps) {
  const { w, h, br } = getShape(num, isUpper);

  const bg = selected
    ? "linear-gradient(160deg, #1a7fe0 0%, #0052a3 100%)"
    : "linear-gradient(160deg, #f0f4f8 0%, #dce3ea 100%)";
  const border = selected ? "2px solid #0044cc" : "1.5px solid #b0bec5";
  const shadow = selected
    ? "0 3px 10px rgba(0,102,204,0.45), inset 0 1px 0 rgba(255,255,255,0.25)"
    : "0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
      {/* Number above tooth for upper jaw */}
      {isUpper && (
        <span style={{
          fontSize: "9px", fontWeight: 700, lineHeight: 1,
          color: selected ? "#0066cc" : "#94a3b8",
          transition: "color 0.15s",
        }}>{num}</span>
      )}

      <button
        type="button"
        onClick={() => onToggle(num)}
        title={`سن ${num}`}
        style={{
          width: w, height: h,
          borderRadius: br,
          background: bg,
          border,
          boxShadow: shadow,
          cursor: "pointer",
          transition: "all 0.15s ease",
          flexShrink: 0,
          position: "relative",
          // Cusp lines for molars/premolars (cosmetic)
          outline: "none",
        }}
        onMouseEnter={e => {
          if (!selected) {
            const el = e.currentTarget;
            el.style.background = "linear-gradient(160deg, rgba(0,102,204,0.12) 0%, rgba(0,102,204,0.06) 100%)";
            el.style.border = "1.5px solid #0066cc";
            el.style.transform = "scale(1.08)";
          }
        }}
        onMouseLeave={e => {
          if (!selected) {
            const el = e.currentTarget;
            el.style.background = "linear-gradient(160deg, #f0f4f8 0%, #dce3ea 100%)";
            el.style.border = "1.5px solid #b0bec5";
            el.style.transform = "scale(1)";
          }
        }}
      />

      {/* Number below tooth for lower jaw */}
      {!isUpper && (
        <span style={{
          fontSize: "9px", fontWeight: 700, lineHeight: 1,
          color: selected ? "#0066cc" : "#94a3b8",
          transition: "color 0.15s",
        }}>{num}</span>
      )}
    </div>
  );
}

interface ToothChartProps {
  selectedTeeth: number[];
  onChange: (teeth: number[]) => void;
}

export function ToothChart({ selectedTeeth, onChange }: ToothChartProps) {
  const toggle = useCallback((n: number) => {
    onChange(selectedTeeth.includes(n) ? selectedTeeth.filter(t => t !== n) : [...selectedTeeth, n]);
  }, [selectedTeeth, onChange]);

  return (
    <div style={{ userSelect: "none", direction: "ltr" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", direction: "rtl" }}>
        <p style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
          انقر على أي سن لتحديده — يتحدث عدد الوحدات فوراً
        </p>
        {selectedTeeth.length > 0 && (
          <button type="button" onClick={() => onChange([])} style={{
            fontSize: "10px", color: "#ef4444",
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "8px", padding: "2px 10px", cursor: "pointer", fontWeight: 700,
          }}>
            مسح الكل
          </button>
        )}
      </div>

      {/* ── UPPER JAW ── */}
      <p style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: "6px" }}>
        UPPER  •  الفك العلوي
      </p>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "2px", paddingBottom: "4px" }}>
        {UPPER.map((n, i) => (
          <div key={n} style={{ marginBottom: `${archOffset(i, 16, 28)}px` }}>
            <ToothBtn num={n} selected={selectedTeeth.includes(n)} isUpper={true} onToggle={toggle} />
          </div>
        ))}
      </div>

      {/* Gum / jaw divider */}
      <div style={{
        margin: "6px 12px",
        height: "6px",
        borderRadius: "3px",
        background: "linear-gradient(to right, transparent 0%, #e2e8f0 15%, #cbd5e1 50%, #e2e8f0 85%, transparent 100%)",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
      }} />

      {/* ── LOWER JAW ── */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: "2px", paddingTop: "4px" }}>
        {LOWER.map((n, i) => (
          <div key={n} style={{ marginTop: `${archOffset(i, 16, 28)}px` }}>
            <ToothBtn num={n} selected={selectedTeeth.includes(n)} isUpper={false} onToggle={toggle} />
          </div>
        ))}
      </div>
      <p style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", marginTop: "6px" }}>
        LOWER  •  الفك السفلي
      </p>

      {/* Selected summary */}
      {selectedTeeth.length > 0 && (
        <div style={{
          marginTop: "12px", padding: "10px 14px", direction: "rtl",
          background: "rgba(0,102,204,0.06)", border: "1px solid rgba(0,102,204,0.18)",
          borderRadius: "12px",
        }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#0066cc", marginBottom: "6px" }}>
            {selectedTeeth.length} سن محدد:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {[...selectedTeeth].sort((a, b) => a - b).map(t => (
              <span key={t} onClick={() => toggle(t)} title="انقر لإلغاء" style={{
                background: "#0066cc", color: "#fff",
                fontSize: "10px", fontWeight: 700,
                padding: "1px 8px", borderRadius: "20px", cursor: "pointer",
              }}>
                {t} ×
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

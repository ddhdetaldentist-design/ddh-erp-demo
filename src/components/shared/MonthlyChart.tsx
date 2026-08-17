"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ChartItem {
  month: string;
  مبيعات: number;
  تحصيل: number;
  مصروفات: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-2xl p-3.5 text-sm shadow-md"
      style={{
        background: "#ffffff",
        border: "1px solid var(--color-border)",
      }}
    >
      <p className="font-bold text-ink mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: p.color }}
          />
          <span style={{ color: "var(--color-ink-muted)" }}>{p.name}:</span>
          <span className="font-semibold text-ink">
            {p.value.toLocaleString("ar-EG")} ج
          </span>
        </div>
      ))}
    </div>
  );
};

export function MonthlyChart({ data = [] }: { data: ChartItem[] }) {
  return (
    <div className="card h-full">
      <h3 className="font-bold text-ink mb-6 flex items-center gap-2 text-base">
        <span
          className="w-1.5 h-4 rounded-full"
          style={{ background: "var(--color-primary)" }}
        />
        الأداء المالي الشهري
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0066cc" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0066cc" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34c759" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#34c759" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ff3b30" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0,0,0,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: "var(--color-ink-muted)", fontSize: 12, paddingTop: 16 }}
          />
          <Area
            type="monotone"
            dataKey="مبيعات"
            stroke="#0066cc"
            strokeWidth={2.5}
            fill="url(#salesGrad)"
          />
          <Area
            type="monotone"
            dataKey="تحصيل"
            stroke="#34c759"
            strokeWidth={2.5}
            fill="url(#collectedGrad)"
          />
          <Area
            type="monotone"
            dataKey="مصروفات"
            stroke="#ff3b30"
            strokeWidth={2.5}
            fill="url(#expensesGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const EASE_OUT_EXPO = "cubic-bezier(0.16,1,0.3,1)";

export type DistPoint = { label: string; gross: number; paid: number };

// Custom tooltip: a .panel with the terminal grammar.
function DoleTooltip(props: { active?: boolean; payload?: unknown[]; label?: string | number }) {
  const { active, payload, label } = props;
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line-strong)",
        borderRadius: "var(--radius)",
        padding: "10px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--ink)",
      }}
    >
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      {payload.map((p) => {
        const row = p as { name?: string; value?: number; color?: string; dataKey?: string };
        return (
          <div key={String(row.dataKey ?? "")} className="tnum" style={{ color: row.color ?? "var(--ink)", marginTop: 2 }}>
            {row.name} · {Number(row.value).toFixed(4)}
          </div>
        );
      })}
    </div>
  );
}

// Distribution ledger over time — gross vs paid, with a dithered fill under the
// gross line (halftone dots dissolving toward the baseline).
export function DistributionChart({ data, height = 260 }: { data: DistPoint[]; height?: number }) {
  const uid = useId().replace(/[:]/g, "");
  const fineId = `dither-fine-${uid}`;
  const topFadeId = `dither-fade-top-${uid}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <pattern id={fineId} patternUnits="userSpaceOnUse" width="3" height="3">
            <circle cx="1.5" cy="1.5" r="0.55" fill="var(--signal)" fillOpacity={0.8} />
          </pattern>
          <linearGradient id={topFadeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#fff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={`mask-${uid}`}>
            <rect width="100%" height="100%" fill={`url(#${topFadeId})`} />
          </mask>
        </defs>
        <CartesianGrid stroke="var(--line)" strokeDasharray="2 3" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="var(--line)"
          tick={{ fill: "var(--faint)", fontFamily: "var(--font-mono)", fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: "var(--line)" }}
          minTickGap={24}
        />
        <YAxis
          stroke="var(--line)"
          tick={{ fill: "var(--faint)", fontFamily: "var(--font-mono)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip content={<DoleTooltip />} cursor={{ stroke: "var(--line)", strokeDasharray: "2 2" }} />
        <Area
          type="monotone"
          dataKey="gross"
          name="gross"
          stroke="var(--signal)"
          strokeWidth={1.5}
          fill={`url(#${fineId})`}
          fillOpacity={0.9}
          mask={`url(#mask-${uid})`}
          animationDuration={800}
          animationEasing={EASE_OUT_EXPO}
        />
        <Line
          type="monotone"
          dataKey="paid"
          name="paid"
          stroke="var(--ink)"
          strokeWidth={1.25}
          dot={false}
          animationDuration={800}
          animationEasing={EASE_OUT_EXPO}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export type Slice = { key: string; value: number };

// Holdings composition donut — the reference's "copy vs fade" becomes the
// per-holder vs pool slice split (or whitelisted vs blocked).
export function CompositionDonut({ data, height = 220 }: { data: Slice[]; height?: number }) {
  const colors = ["var(--signal)", "var(--gain)", "var(--loss)", "var(--muted)", "var(--faint)"];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="key"
          innerRadius="62%"
          outerRadius="86%"
          paddingAngle={2}
          stroke="var(--bg)"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<DoleTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORICAL, CHART_INK } from "@/lib/chartColors";

export function CommandBarChart({ data }: { data: { command: string; calls: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-zinc-500">No command activity yet.</p>;
  }

  const top = data.slice(0, 10);

  return (
    <div style={{ height: Math.max(160, top.length * 28) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={CHART_INK.grid} />
          <XAxis
            type="number"
            tick={{ fill: CHART_INK.muted, fontSize: 11 }}
            axisLine={{ stroke: CHART_INK.baseline }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="command"
            width={90}
            tick={{ fill: CHART_INK.secondary, fontSize: 12, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART_INK.baseline }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#18181b", border: "1px solid #2c2c2a", borderRadius: 6, fontSize: 12 }}
          />
          <Bar dataKey="calls" fill={CATEGORICAL[0]} radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

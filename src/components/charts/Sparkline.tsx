"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_INK } from "@/lib/chartColors";

export interface SparklinePoint {
  t: number;
  v: number;
}

export function Sparkline({
  title,
  data,
  color,
  valueLabel,
  sub,
  formatTooltip,
}: {
  title: string;
  data: SparklinePoint[];
  color: string;
  valueLabel: string;
  sub?: string;
  formatTooltip?: (v: number) => string;
}) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-50">{valueLabel}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
      <div className="mt-2 h-16">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                cursor={{ stroke: CHART_INK.grid, strokeWidth: 1 }}
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #2c2c2a",
                  borderRadius: 6,
                  fontSize: 12,
                  padding: "4px 8px",
                }}
                labelFormatter={() => ""}
                formatter={(value) => [formatTooltip ? formatTooltip(Number(value)) : String(value), title]}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center text-xs text-zinc-600">Collecting data…</div>
        )}
      </div>
    </div>
  );
}

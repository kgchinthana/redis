"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { colorForType } from "@/lib/chartColors";

export function TypeDonut({ counts }: { counts: Record<string, number> }) {
  const data = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ name: type, value: count }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return <p className="text-sm text-zinc-500">No keys to summarize.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={78}
              paddingAngle={2}
              strokeWidth={2}
              stroke="#18181b"
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={colorForType(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #2c2c2a", borderRadius: 6, fontSize: 12 }}
              formatter={(value, name) => {
                const num = Number(value);
                return [`${num.toLocaleString()} (${((num / total) * 100).toFixed(1)}%)`, String(name)];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex w-full flex-1 flex-col gap-1.5 text-sm">
        {data.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-zinc-300">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorForType(entry.name) }} />
              {entry.name}
            </span>
            <span className="tabular-nums text-zinc-500">{entry.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

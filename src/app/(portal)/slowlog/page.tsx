"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Timer } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { CommandBarChart } from "@/components/charts/CommandBarChart";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";

type SlowLogEntry = {
  id: number;
  timestamp: number;
  microseconds: number;
  args: string[];
  clientAddr: string;
  clientName: string;
};

type CommandStat = {
  command: string;
  calls: number;
  usecPerCall: number;
  rejectedCalls: number;
  failedCalls: number;
};

export default function SlowLogPage() {
  const [entries, setEntries] = useState<SlowLogEntry[]>([]);
  const [stats, setStats] = useState<CommandStat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  const { showToast } = useToast();

  const load = useCallback(async () => {
    const [slowRes, statsRes] = await Promise.all([
      fetch("/api/slowlog?count=100", { cache: "no-store" }),
      fetch("/api/commandstats", { cache: "no-store" }),
    ]);
    const slowJson = await slowRes.json();
    const statsJson = await statsRes.json();
    if (!slowRes.ok) {
      setError(slowJson.error || "Failed to load slow log");
      return;
    }
    setEntries(slowJson.entries);
    setStats(statsJson.stats || []);
    setError(null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function resetSlowLog() {
    const ok = await confirm({
      title: "Reset slow log",
      message: "This clears all recorded slow log entries. This cannot be undone.",
      confirmLabel: "Reset",
      danger: true,
    });
    if (!ok) return;
    await fetch("/api/slowlog", { method: "DELETE" });
    showToast("Slow log reset", "success");
    load();
  }

  const totalCalls = stats.reduce((sum, s) => sum + s.calls, 0);
  const slowestMs = entries.length > 0 ? Math.max(...entries.map((e) => e.microseconds)) / 1000 : 0;
  const topCommand = stats[0]?.command ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-50">Slow Log &amp; Command Stats</h1>
        <button
          onClick={resetSlowLog}
          className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          <RotateCcw size={14} />
          Reset slow log
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Slow Log Entries" value={String(entries.length)} icon={Timer} />
        <StatCard label="Slowest Entry" value={`${slowestMs.toFixed(2)} ms`} />
        <StatCard label="Total Commands" value={totalCalls.toLocaleString()} />
        <StatCard label="Most-called Command" value={topCommand} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">Top Commands by Calls</h2>
          <CommandBarChart data={stats.map((s) => ({ command: s.command, calls: s.calls }))} />
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">Command Stats</h2>
          {stats.length === 0 ? (
            <p className="text-sm text-zinc-500">No command stats available.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="text-zinc-500">
                    <th className="pb-2 pr-4 font-medium">Command</th>
                    <th className="pb-2 pr-4 font-medium">Calls</th>
                    <th className="pb-2 pr-4 font-medium">Avg usec/call</th>
                    <th className="pb-2 font-medium">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => (
                    <tr key={stat.command} className="border-t border-zinc-800 text-zinc-300">
                      <td className="py-1.5 pr-4 font-mono text-xs">{stat.command}</td>
                      <td className="py-1.5 pr-4">{stat.calls}</td>
                      <td className="py-1.5 pr-4">{stat.usecPerCall.toFixed(2)}</td>
                      <td className="py-1.5">{stat.failedCalls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Slow Log ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">No slow commands recorded.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-900">
                <tr className="text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Time</th>
                  <th className="pb-2 pr-4 font-medium">Duration</th>
                  <th className="pb-2 pr-4 font-medium">Command</th>
                  <th className="pb-2 font-medium">Client</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-zinc-800 text-zinc-300">
                    <td className="py-1.5 pr-4 whitespace-nowrap">{new Date(entry.timestamp * 1000).toLocaleTimeString()}</td>
                    <td className="py-1.5 pr-4 whitespace-nowrap">{(entry.microseconds / 1000).toFixed(2)} ms</td>
                    <td className="py-1.5 pr-4 break-all font-mono text-xs">{entry.args.join(" ")}</td>
                    <td className="py-1.5 text-zinc-500">{entry.clientAddr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";

type InfoResponse = {
  info: Record<string, Record<string, string>>;
  dbSize: number;
};

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-50">{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<InfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/info", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load info");
        return;
      }
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to reach the server");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    fetchInfo();
    const interval = setInterval(fetchInfo, 3000);
    return () => clearInterval(interval);
  }, [fetchInfo]);

  if (error) {
    return (
      <div className="rounded-md border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
        {error} — check your connection settings.
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-zinc-500">Loading...</div>;
  }

  const server = data.info["Server"] || {};
  const clients = data.info["Clients"] || {};
  const memory = data.info["Memory"] || {};
  const stats = data.info["Stats"] || {};
  const replication = data.info["Replication"] || {};
  const keyspace = data.info["Keyspace"] || {};

  const hits = Number(stats.keyspace_hits || 0);
  const misses = Number(stats.keyspace_misses || 0);
  const hitRate = hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(1) : "—";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-50">Dashboard</h1>
        {lastUpdated && (
          <span className="text-xs text-zinc-500">Updated {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Used Memory" value={formatBytes(Number(memory.used_memory || 0))} sub={`peak ${formatBytes(Number(memory.used_memory_peak || 0))}`} />
        <StatCard label="Connected Clients" value={clients.connected_clients || "0"} />
        <StatCard label="Ops / sec" value={stats.instantaneous_ops_per_sec || "0"} />
        <StatCard label="Hit Rate" value={`${hitRate}%`} sub={`${hits} hits / ${misses} misses`} />
        <StatCard label="Total Keys" value={String(data.dbSize)} />
        <StatCard label="Uptime" value={formatUptime(Number(server.uptime_in_seconds || 0))} />
        <StatCard label="Role" value={replication.role || "unknown"} sub={`connected slaves: ${replication.connected_slaves ?? "0"}`} />
        <StatCard label="Redis Version" value={server.redis_version || "—"} />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Keyspace</h2>
        {Object.keys(keyspace).length === 0 ? (
          <p className="text-sm text-zinc-500">No keys in any database.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-zinc-500">
                <th className="pb-2 font-medium">Database</th>
                <th className="pb-2 font-medium">Keys</th>
                <th className="pb-2 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(keyspace).map(([db, value]) => {
                const fields = Object.fromEntries(
                  value.split(",").map((p) => p.split("=") as [string, string])
                );
                return (
                  <tr key={db} className="border-t border-zinc-800 text-zinc-300">
                    <td className="py-1.5">{db}</td>
                    <td className="py-1.5">{fields.keys}</td>
                    <td className="py-1.5">{fields.expires}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

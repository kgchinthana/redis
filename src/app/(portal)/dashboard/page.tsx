"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Cpu, Database, HardDrive, RefreshCw, Save, Users } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Sparkline, type SparklinePoint } from "@/components/charts/Sparkline";
import { TypeDonut } from "@/components/charts/TypeDonut";
import { CATEGORICAL, STATUS } from "@/lib/chartColors";

type InfoResponse = {
  info: Record<string, Record<string, string>>;
  dbSize: number;
};

type KeyspaceStats = { counts: Record<string, number>; scanned: number; truncated: boolean };

const MAX_POINTS = 60;

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

function formatRelativeTime(unixSeconds: number): string {
  if (!unixSeconds) return "never";
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function pushPoint(prev: SparklinePoint[], v: number): SparklinePoint[] {
  const next = [...prev, { t: Date.now(), v }];
  return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
}

export default function DashboardPage() {
  const [data, setData] = useState<InfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [opsHistory, setOpsHistory] = useState<SparklinePoint[]>([]);
  const [memHistory, setMemHistory] = useState<SparklinePoint[]>([]);
  const [hitRateHistory, setHitRateHistory] = useState<SparklinePoint[]>([]);
  const [clientsHistory, setClientsHistory] = useState<SparklinePoint[]>([]);
  const [cpuPercent, setCpuPercent] = useState<number | null>(null);
  const prevCpu = useRef<{ total: number; at: number } | null>(null);

  const [keyspaceStats, setKeyspaceStats] = useState<KeyspaceStats | null>(null);
  const [keyspaceError, setKeyspaceError] = useState<string | null>(null);
  const [keyspaceLoading, setKeyspaceLoading] = useState(false);

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

      const stats = json.info["Stats"] || {};
      const memory = json.info["Memory"] || {};
      const clients = json.info["Clients"] || {};
      const cpu = json.info["CPU"] || {};

      setOpsHistory((prev) => pushPoint(prev, Number(stats.instantaneous_ops_per_sec || 0)));
      setMemHistory((prev) => pushPoint(prev, Number(memory.used_memory || 0)));
      setClientsHistory((prev) => pushPoint(prev, Number(clients.connected_clients || 0)));

      const hits = Number(stats.keyspace_hits || 0);
      const misses = Number(stats.keyspace_misses || 0);
      const rate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;
      setHitRateHistory((prev) => pushPoint(prev, rate));

      const totalCpu = Number(cpu.used_cpu_sys || 0) + Number(cpu.used_cpu_user || 0);
      const now = Date.now();
      if (prevCpu.current) {
        const deltaCpu = totalCpu - prevCpu.current.total;
        const deltaTime = (now - prevCpu.current.at) / 1000;
        if (deltaTime > 0) setCpuPercent(Math.max(0, (deltaCpu / deltaTime) * 100));
      }
      prevCpu.current = { total: totalCpu, at: now };
    } catch {
      setError("Failed to reach the server");
    }
  }, []);

  const fetchKeyspaceStats = useCallback(async () => {
    setKeyspaceLoading(true);
    try {
      const res = await fetch("/api/keyspace-stats", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setKeyspaceError(json.error || "Failed to load key type stats");
        return;
      }
      setKeyspaceStats(json);
      setKeyspaceError(null);
    } finally {
      setKeyspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    fetchInfo();
    const interval = setInterval(fetchInfo, 3000);
    return () => clearInterval(interval);
  }, [fetchInfo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    fetchKeyspaceStats();
    const interval = setInterval(fetchKeyspaceStats, 20000);
    return () => clearInterval(interval);
  }, [fetchKeyspaceStats]);

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
  const persistence = data.info["Persistence"] || {};
  const keyspace = data.info["Keyspace"] || {};

  const hits = Number(stats.keyspace_hits || 0);
  const misses = Number(stats.keyspace_misses || 0);
  const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : null;

  const maxMemory = Number(memory.maxmemory || 0);
  const usedMemory = Number(memory.used_memory || 0);
  const systemMemory = Number(memory.total_system_memory || 0);
  const memoryCap = maxMemory > 0 ? maxMemory : systemMemory;
  const memoryPct = memoryCap > 0 ? Math.min(100, (usedMemory / memoryCap) * 100) : 0;
  const memoryCapLabel = maxMemory > 0 ? "maxmemory limit" : "system memory";

  const aofOk = persistence.aof_enabled === "1" ? persistence.aof_last_bgrewrite_status === "ok" || persistence.aof_last_bgrewrite_status === undefined : true;
  const rdbOk = persistence.rdb_last_bgsave_status === "ok";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-50">Dashboard</h1>
        {lastUpdated && (
          <span className="text-xs text-zinc-500">Updated {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Sparkline
          title="Ops / sec"
          data={opsHistory}
          color={CATEGORICAL[0]}
          valueLabel={stats.instantaneous_ops_per_sec || "0"}
        />
        <Sparkline
          title="Used Memory"
          data={memHistory}
          color={CATEGORICAL[2]}
          valueLabel={formatBytes(usedMemory)}
          formatTooltip={(v) => formatBytes(v)}
        />
        <Sparkline
          title="Hit Rate"
          data={hitRateHistory}
          color={CATEGORICAL[3]}
          valueLabel={hitRate === null ? "—" : `${hitRate.toFixed(1)}%`}
          sub={`${hits} hits / ${misses} misses`}
          formatTooltip={(v) => `${v.toFixed(1)}%`}
        />
        <Sparkline
          title="Connected Clients"
          data={clientsHistory}
          color={CATEGORICAL[6]}
          valueLabel={clients.connected_clients || "0"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="CPU Usage"
          value={cpuPercent === null ? "—" : `${cpuPercent.toFixed(1)}%`}
          sub="sys + user"
          icon={Cpu}
        />
        <StatCard
          label="Network I/O"
          value={`${stats.instantaneous_input_kbps || 0} kb/s`}
          sub={`out ${stats.instantaneous_output_kbps || 0} kb/s`}
          icon={Activity}
        />
        <StatCard label="Total Keys" value={String(data.dbSize)} icon={Database} />
        <StatCard label="Uptime" value={formatUptime(Number(server.uptime_in_seconds || 0))} icon={HardDrive} />
        <StatCard
          label="Role"
          value={replication.role || "unknown"}
          sub={`replicas: ${replication.connected_slaves ?? "0"}`}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">Memory</h2>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-zinc-300">{formatBytes(usedMemory)}</span>
            <span className="text-zinc-500">
              of {memoryCap > 0 ? formatBytes(memoryCap) : "unlimited"} ({memoryCapLabel})
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${memoryPct}%`,
                backgroundColor: memoryPct > 90 ? STATUS.critical : memoryPct > 75 ? STATUS.warning : CATEGORICAL[0],
              }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-500">
            <div>
              Peak <span className="text-zinc-300">{formatBytes(Number(memory.used_memory_peak || 0))}</span>
            </div>
            <div>
              Fragmentation ratio <span className="text-zinc-300">{memory.mem_fragmentation_ratio || "—"}</span>
            </div>
            <div>
              RSS <span className="text-zinc-300">{formatBytes(Number(memory.used_memory_rss || 0))}</span>
            </div>
            <div>
              Allocator <span className="text-zinc-300">{memory.mem_allocator || "—"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Save size={14} /> Persistence
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">AOF</div>
              <div className="flex items-center gap-1.5 text-zinc-200">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: persistence.aof_enabled === "1" ? (aofOk ? STATUS.good : STATUS.critical) : "#52525b" }}
                />
                {persistence.aof_enabled === "1" ? "enabled" : "disabled"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Last RDB save</div>
              <div className="flex items-center gap-1.5 text-zinc-200">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rdbOk ? STATUS.good : STATUS.critical }} />
                {formatRelativeTime(Number(persistence.rdb_last_save_time || 0))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Changes since save</div>
              <div className="text-zinc-200">{persistence.rdb_changes_since_last_save || "0"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">AOF size</div>
              <div className="text-zinc-200">{formatBytes(Number(persistence.aof_current_size || 0))}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Key Type Distribution</h2>
            <button
              onClick={fetchKeyspaceStats}
              disabled={keyspaceLoading}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
            >
              <RefreshCw size={12} className={keyspaceLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
          {keyspaceError && <p className="text-sm text-red-400">{keyspaceError}</p>}
          {!keyspaceError && keyspaceStats && (
            <>
              <TypeDonut counts={keyspaceStats.counts} />
              {keyspaceStats.truncated && (
                <p className="mt-3 text-xs text-zinc-600">
                  Sampled first {keyspaceStats.scanned.toLocaleString()} keys (large keyspace — showing an estimate).
                </p>
              )}
            </>
          )}
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
    </div>
  );
}

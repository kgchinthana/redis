"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Users, XCircle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";

type ClientRow = Record<string, string>;

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const confirm = useConfirm();
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load clients");
        return;
      }
      setClients(json.clients);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function killClient(client: ClientRow) {
    const ok = await confirm({
      title: "Kill connection",
      message: `Disconnect client ${client.id} (${client.addr})? Any in-flight command will be aborted.`,
      confirmLabel: "Kill connection",
      danger: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/clients?id=${encodeURIComponent(client.id)}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || "Failed to kill client", "error");
      return;
    }
    showToast(`Killed client ${client.id}`, "success");
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-50">Connected Clients</h1>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Connections" value={String(clients.length)} icon={Users} />
        <StatCard
          label="Subscribers"
          value={String(clients.filter((c) => Number(c.sub || 0) > 0 || Number(c.psub || 0) > 0).length)}
        />
        <StatCard label="In Transaction" value={String(clients.filter((c) => c.multi && c.multi !== "-1").length)} />
        <StatCard
          label="Databases in use"
          value={String(new Set(clients.map((c) => c.db)).size)}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-zinc-500">
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Address</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">DB</th>
              <th className="px-3 py-2 font-medium">Age</th>
              <th className="px-3 py-2 font-medium">Idle</th>
              <th className="px-3 py-2 font-medium">Last Command</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t border-zinc-800 text-zinc-300">
                <td className="px-3 py-2">{client.id}</td>
                <td className="px-3 py-2 font-mono text-xs">{client.addr}</td>
                <td className="px-3 py-2 text-zinc-500">{client.name || "—"}</td>
                <td className="px-3 py-2">{client.db}</td>
                <td className="px-3 py-2">{client.age}s</td>
                <td className="px-3 py-2">{client.idle}s</td>
                <td className="px-3 py-2 font-mono text-xs">{client.cmd}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => killClient(client)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  >
                    <XCircle size={12} />
                    Kill
                  </button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                  No connected clients.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

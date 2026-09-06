"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleDot, Gauge, KeyRound, LayoutDashboard, LogOut, Settings, Terminal, Users } from "lucide-react";
import { useToast } from "./Toast";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/keys", label: "Keys", icon: KeyRound },
  { href: "/query", label: "Query", icon: Terminal },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/slowlog", label: "Slow Log", icon: Gauge },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [db, setDb] = useState(0);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connInfo, setConnInfo] = useState<{ host: string; port: number } | null>(null);

  useEffect(() => {
    fetch("/api/connection")
      .then((r) => r.json())
      .then((json) => {
        setDb(json.db ?? 0);
        setConnInfo({ host: json.host, port: json.port });
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/info", { cache: "no-store" });
        if (!cancelled) setConnected(res.ok);
      } catch {
        if (!cancelled) setConnected(false);
      }
    }
    check();
    const interval = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleDbChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = Number(e.target.value);
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ db: next }),
    });
    if (res.ok) {
      setDb(next);
      showToast(`Switched to database ${next}`, "success");
      router.refresh();
    } else {
      const json = await res.json();
      showToast(json.error || "Failed to switch database", "error");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-sm font-bold text-white">
          R
        </div>
        <span className="text-sm font-semibold text-zinc-50">Redis Portal</span>
      </div>

      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
          <CircleDot
            size={12}
            className={connected === null ? "text-zinc-600" : connected ? "text-emerald-500" : "text-red-500"}
          />
          <span className="truncate">{connInfo ? `${connInfo.host}:${connInfo.port}` : "connecting..."}</span>
        </div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Database</label>
        <select
          value={db}
          onChange={handleDbChange}
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-600"
        >
          {Array.from({ length: 16 }, (_, i) => (
            <option key={i} value={i}>
              db{i}
            </option>
          ))}
        </select>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                active ? "bg-emerald-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <Icon size={16} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("6379");
  const [tls, setTls] = useState(false);
  const [password, setPassword] = useState("__unchanged__");
  const [hasPassword, setHasPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/connection")
      .then((res) => res.json())
      .then((json) => {
        setHost(json.host);
        setPort(String(json.port));
        setTls(json.tls);
        setHasPassword(json.hasPassword);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port: Number(port), tls, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error || "Failed to save" });
        return;
      }
      setMessage({ type: "ok", text: "Connection saved and verified." });
      setPassword("__unchanged__");
      setHasPassword(Boolean(password !== "__unchanged__" ? password : hasPassword));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-lg font-semibold text-zinc-50">Redis Connection</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        {message && (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              message.type === "ok"
                ? "border border-emerald-800 bg-emerald-950 text-emerald-300"
                : "border border-red-800 bg-red-950 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Host</label>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Port</label>
          <input
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            Password {hasPassword && <span className="text-zinc-600">(leave as-is to keep current)</span>}
          </label>
          <input
            type="password"
            value={password === "__unchanged__" ? "" : password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasPassword ? "•••••••• (unchanged)" : "No password set"}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={tls} onChange={(e) => setTls(e.target.checked)} />
          Use TLS
        </label>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Testing connection..." : "Save connection"}
        </button>
      </form>
    </div>
  );
}

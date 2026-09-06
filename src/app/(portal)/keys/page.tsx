"use client";

import { useCallback, useEffect, useState } from "react";

type KeyRow = { key: string; type: string; ttl: number };

type KeyDetail = {
  key: string;
  type: string;
  ttl: number;
  value: unknown;
};

function ttlLabel(ttl: number): string {
  if (ttl === -1) return "no expiry";
  if (ttl === -2) return "expired";
  return `${ttl}s`;
}

function renderValue(detail: KeyDetail) {
  switch (detail.type) {
    case "string":
      return <pre className="whitespace-pre-wrap break-all text-sm text-zinc-200">{String(detail.value)}</pre>;
    case "hash": {
      const entries = detail.value as [string, string][];
      return (
        <table className="w-full text-left text-sm">
          <tbody>
            {entries.map(([field, val]) => (
              <tr key={field} className="border-t border-zinc-800">
                <td className="py-1 pr-4 font-medium text-zinc-400">{field}</td>
                <td className="py-1 break-all text-zinc-200">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "list":
    case "set": {
      const items = detail.value as string[];
      return (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-200">
          {items.map((item, i) => (
            <li key={i} className="break-all">{item}</li>
          ))}
        </ol>
      );
    }
    case "zset": {
      const items = detail.value as { member: string; score: string }[];
      return (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-zinc-500">
              <th className="pb-1 font-medium">Member</th>
              <th className="pb-1 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-t border-zinc-800">
                <td className="py-1 break-all text-zinc-200">{item.member}</td>
                <td className="py-1 text-zinc-400">{item.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    default:
      return <pre className="whitespace-pre-wrap break-all text-sm text-zinc-200">{JSON.stringify(detail.value, null, 2)}</pre>;
  }
}

export default function KeysPage() {
  const [pattern, setPattern] = useState("*");
  const [rows, setRows] = useState<KeyRow[]>([]);
  const [cursor, setCursor] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<KeyDetail | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editTtl, setEditTtl] = useState("");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const search = useCallback(async (searchPattern: string, append: boolean, fromCursor = "0") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/keys?pattern=${encodeURIComponent(searchPattern)}&cursor=${fromCursor}&count=200`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load keys");
        return;
      }
      setRows((prev) => (append ? [...prev, ...json.keys] : json.keys));
      setCursor(json.cursor);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    search("*", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openKey(key: string) {
    setSelected(key);
    setDetail(null);
    setDetailError(null);
    const res = await fetch(`/api/keys/${encodeURIComponent(key)}`);
    const json = await res.json();
    if (!res.ok) {
      setDetailError(json.error || "Failed to load key");
      return;
    }
    setDetail(json);
    setEditValue(json.type === "string" ? String(json.value) : "");
    setEditTtl(json.ttl > 0 ? String(json.ttl) : "");
  }

  async function saveValue() {
    if (!selected) return;
    setSaving(true);
    setDetailError(null);
    try {
      const body: Record<string, unknown> = {};
      if (detail?.type === "string") body.value = editValue;
      if (editTtl !== "") body.ttl = Number(editTtl);
      const res = await fetch(`/api/keys/${encodeURIComponent(selected)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setDetailError(json.error || "Failed to save");
        return;
      }
      await openKey(selected);
    } finally {
      setSaving(false);
    }
  }

  async function persistKey() {
    if (!selected) return;
    await fetch(`/api/keys/${encodeURIComponent(selected)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: -1 }),
    });
    openKey(selected);
  }

  async function deleteKey(key: string) {
    if (!confirm(`Delete key "${key}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/keys/${encodeURIComponent(key)}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.key !== key));
      if (selected === key) {
        setSelected(null);
        setDetail(null);
      }
    }
  }

  return (
    <div className="flex gap-6">
      <div className="flex w-1/2 flex-col gap-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            search(pattern, false);
          }}
        >
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Pattern, e.g. user:*"
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
          />
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Search
          </button>
        </form>

        {error && (
          <div className="rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</div>
        )}

        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-zinc-900">
              <tr className="text-zinc-500">
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">TTL</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className={`cursor-pointer border-t border-zinc-800 hover:bg-zinc-800/50 ${selected === row.key ? "bg-zinc-800" : ""}`}
                  onClick={() => openKey(row.key)}
                >
                  <td className="px-3 py-2 text-zinc-200 break-all">{row.key}</td>
                  <td className="px-3 py-2 text-zinc-400">{row.type}</td>
                  <td className="px-3 py-2 text-zinc-400">{ttlLabel(row.ttl)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteKey(row.key);
                      }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                    No keys found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{rows.length} keys loaded</span>
          {cursor !== "0" && (
            <button
              onClick={() => search(pattern, true, cursor)}
              disabled={loading}
              className="rounded-md border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      </div>

      <div className="w-1/2">
        {!selected && <div className="text-sm text-zinc-500">Select a key to view its details.</div>}

        {selected && !detail && !detailError && <div className="text-sm text-zinc-500">Loading...</div>}

        {detailError && (
          <div className="rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">{detailError}</div>
        )}

        {detail && (
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Key</div>
              <div className="break-all text-sm font-medium text-zinc-100">{detail.key}</div>
            </div>

            <div className="flex gap-6 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Type</div>
                <div className="text-zinc-200">{detail.type}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">TTL</div>
                <div className="text-zinc-200">{ttlLabel(detail.ttl)}</div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Value</div>
              {detail.type === "string" ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={8}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-600"
                />
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950 p-3">
                  {renderValue(detail)}
                </div>
              )}
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Set TTL (seconds)</div>
                <input
                  value={editTtl}
                  onChange={(e) => setEditTtl(e.target.value)}
                  placeholder="e.g. 3600"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
                />
              </div>
              <button
                onClick={persistKey}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Persist (remove TTL)
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => deleteKey(detail.key)}
                className="rounded-md border border-red-800 px-4 py-2 text-sm text-red-300 hover:bg-red-950"
              >
                Delete key
              </button>
              <button
                onClick={saveValue}
                disabled={saving}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

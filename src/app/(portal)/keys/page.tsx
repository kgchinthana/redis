"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { colorForType } from "@/lib/chartColors";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";

type KeyRow = { key: string; type: string; ttl: number };

type KeyDetail = {
  key: string;
  type: string;
  ttl: number;
  value: unknown;
};

const TYPE_FILTERS = ["all", "string", "hash", "list", "set", "zset", "stream"];

function ttlLabel(ttl: number): string {
  if (ttl === -1) return "no expiry";
  if (ttl === -2) return "expired";
  return `${ttl}s`;
}

function TypeBadge({ type }: { type: string }) {
  const color = colorForType(type);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {type}
    </span>
  );
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
  const [typeFilter, setTypeFilter] = useState("all");
  const [rows, setRows] = useState<KeyRow[]>([]);
  const [cursor, setCursor] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<KeyDetail | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editTtl, setEditTtl] = useState("");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");

  const confirm = useConfirm();
  const { showToast } = useToast();

  const search = useCallback(async (searchPattern: string, type: string, append: boolean, fromCursor = "0") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/keys?pattern=${encodeURIComponent(searchPattern)}&type=${type}&cursor=${fromCursor}&count=200`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load keys");
        return;
      }
      setRows((prev) => (append ? [...prev, ...json.keys] : json.keys));
      setCursor(json.cursor);
      if (!append) setSelectedRows(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    search("*", "all", false);
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
      showToast("Key saved", "success");
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
    showToast("TTL removed", "success");
    openKey(selected);
  }

  async function deleteKey(key: string) {
    const ok = await confirm({
      title: "Delete key",
      message: `Delete key "${key}"? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/keys/${encodeURIComponent(key)}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.key !== key));
      setSelectedRows((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      if (selected === key) {
        setSelected(null);
        setDetail(null);
      }
      showToast(`Deleted "${key}"`, "success");
    } else {
      showToast("Failed to delete key", "error");
    }
  }

  async function deleteSelected() {
    const keys = Array.from(selectedRows);
    if (keys.length === 0) return;
    const ok = await confirm({
      title: `Delete ${keys.length} keys`,
      message: `Delete ${keys.length} selected key(s)? This cannot be undone.`,
      confirmLabel: `Delete ${keys.length}`,
      danger: true,
    });
    if (!ok) return;
    const results = await Promise.all(
      keys.map((key) => fetch(`/api/keys/${encodeURIComponent(key)}`, { method: "DELETE" }))
    );
    const deleted = new Set(keys.filter((_, i) => results[i].ok));
    setRows((prev) => prev.filter((r) => !deleted.has(r.key)));
    setSelectedRows(new Set());
    if (selected && deleted.has(selected)) {
      setSelected(null);
      setDetail(null);
    }
    showToast(`Deleted ${deleted.size} of ${keys.length} keys`, deleted.size === keys.length ? "success" : "error");
  }

  function toggleRow(key: string) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelectedRows((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.key))));
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard`, "success");
    } catch {
      showToast("Clipboard access denied", "error");
    }
  }

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const res = await fetch(`/api/keys/${encodeURIComponent(newKeyName.trim())}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newKeyValue }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || "Failed to create key", "error");
      return;
    }
    showToast(`Created "${newKeyName.trim()}"`, "success");
    setCreating(false);
    setNewKeyName("");
    setNewKeyValue("");
    search(pattern, typeFilter, false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-50">Keys</h1>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus size={14} />
          New key
        </button>
      </div>

      {creating && (
        <form onSubmit={createKey} className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex-1 min-w-40">
            <label className="mb-1 block text-xs text-zinc-500">Key name</label>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-600"
              autoFocus
              required
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="mb-1 block text-xs text-zinc-500">Value (string)</label>
            <input
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-600"
            />
          </div>
          <button type="submit" className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">
            Create
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <X size={14} />
          </button>
        </form>
      )}

      <div className="flex gap-6">
        <div className="flex w-1/2 flex-col gap-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              search(pattern, typeFilter, false);
            }}
          >
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Pattern, e.g. user:*"
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
            />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                search(pattern, e.target.value, false);
              }}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
            >
              {TYPE_FILTERS.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "All types" : t}
                </option>
              ))}
            </select>
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

          {selectedRows.size > 0 && (
            <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm">
              <span className="text-zinc-300">{selectedRows.size} selected</span>
              <button onClick={deleteSelected} className="flex items-center gap-1.5 text-red-400 hover:text-red-300">
                <Trash2 size={14} />
                Delete selected
              </button>
            </div>
          )}

          <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-900">
                <tr className="text-zinc-500">
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selectedRows.size === rows.length}
                      onChange={toggleAll}
                    />
                  </th>
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
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedRows.has(row.key)} onChange={() => toggleRow(row.key)} />
                    </td>
                    <td className="px-3 py-2 text-zinc-200 break-all">{row.key}</td>
                    <td className="px-3 py-2">
                      <TypeBadge type={row.type} />
                    </td>
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
                    <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
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
                onClick={() => search(pattern, typeFilter, true, cursor)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
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
                <div className="flex items-center gap-2">
                  <span className="break-all text-sm font-medium text-zinc-100">{detail.key}</span>
                  <button onClick={() => copyToClipboard(detail.key, "Key name")} className="text-zinc-500 hover:text-zinc-300">
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              <div className="flex gap-6 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Type</div>
                  <TypeBadge type={detail.type} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">TTL</div>
                  <div className="text-zinc-200">{ttlLabel(detail.ttl)}</div>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">Value</span>
                  {detail.type === "string" && (
                    <button
                      onClick={() => copyToClipboard(editValue, "Value")}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                  )}
                </div>
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
                  className="flex items-center gap-1.5 rounded-md border border-red-800 px-4 py-2 text-sm text-red-300 hover:bg-red-950"
                >
                  <Trash2 size={14} />
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
    </div>
  );
}

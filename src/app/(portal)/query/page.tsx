"use client";

import { useMemo, useRef, useState } from "react";
import { applySuggestion, getSuggestions } from "@/lib/commandSuggestions";

type Entry = {
  command: string;
  result?: unknown;
  error?: string;
  durationMs?: number;
};

function formatResult(result: unknown): string {
  if (result === null) return "(nil)";
  if (typeof result === "string") return result;
  if (typeof result === "number" || typeof result === "boolean") return String(result);
  if (Array.isArray(result)) {
    if (result.length === 0) return "(empty array)";
    return result.map((item, i) => `${i + 1}) ${formatResult(item)}`).join("\n");
  }
  return JSON.stringify(result, null, 2);
}

const EXAMPLES = ["PING", "SET foo bar", "GET foo", "KEYS *", "INFO server", "DBSIZE"];

export default function QueryPage() {
  const [history, setHistory] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => getSuggestions(input), [input]);
  const showSuggestions = !dismissed && suggestions.length > 0;

  async function runCommand(command: string) {
    if (!command.trim()) return;
    setRunning(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const json = await res.json();
      const entry: Entry = res.ok
        ? { command, result: json.result, durationMs: json.durationMs }
        : { command, error: json.error };
      setHistory((prev) => [...prev, entry]);
      setCommandHistory((prev) => [...prev, command]);
      setHistoryIndex(null);
      setInput("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setRunning(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    setDismissed(false);
    setHighlightIndex(0);
  }

  function selectSuggestion(label: string) {
    setInput(applySuggestion(input, label));
    setDismissed(false);
    setHighlightIndex(0);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        selectSuggestion(suggestions[highlightIndex].label);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissed(true);
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      runCommand(input);
    } else if (e.key === "ArrowUp" && !showSuggestions) {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === null ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(commandHistory[nextIndex]);
    } else if (e.key === "ArrowDown" && !showSuggestions) {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(null);
        setInput("");
      } else {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-50">Query Console</h1>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => runCommand(ex)}
              className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-black p-4 font-mono text-sm">
        {history.length === 0 && (
          <div className="text-zinc-600">Run a Redis command, e.g. <code>SET foo bar</code>, then <code>GET foo</code>.</div>
        )}
        {history.map((entry, i) => (
          <div key={i} className="mb-3">
            <div className="text-emerald-500">
              <span className="text-zinc-600">redis&gt; </span>
              {entry.command}
            </div>
            {entry.error ? (
              <div className="whitespace-pre-wrap text-red-400">(error) {entry.error}</div>
            ) : (
              <div className="whitespace-pre-wrap text-zinc-300">{formatResult(entry.result)}</div>
            )}
            {entry.durationMs !== undefined && (
              <div className="text-xs text-zinc-600">{entry.durationMs}ms</div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="relative flex gap-2">
        {showSuggestions && (
          <ul className="absolute bottom-full left-0 mb-1 max-h-64 w-full max-w-xl overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-lg">
            {suggestions.map((s, i) => (
              <li
                key={s.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s.label)}
                className={`flex cursor-pointer items-baseline gap-3 px-3 py-1.5 text-sm ${
                  i === highlightIndex ? "bg-emerald-600 text-white" : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <span className="font-mono font-medium">{s.label}</span>
                <span className={`truncate text-xs ${i === highlightIndex ? "text-emerald-100" : "text-zinc-500"}`}>
                  {s.syntax}
                </span>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={inputRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setDismissed(true), 100)}
          onFocus={() => setDismissed(false)}
          placeholder="Enter a Redis command... (Tab to autocomplete)"
          disabled={running}
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-600 disabled:opacity-50"
          autoFocus
          autoComplete="off"
        />
        <button
          onClick={() => runCommand(input)}
          disabled={running}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Run
        </button>
      </div>
    </div>
  );
}

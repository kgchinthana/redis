"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
};

type NormalizedOptions = Required<ConfirmOptions>;

type ConfirmContextValue = { confirm: (options: ConfirmOptions | string) => Promise<boolean> };

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<NormalizedOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string) => {
    const raw = typeof opts === "string" ? { message: opts } : opts;
    const normalized: NormalizedOptions = {
      title: raw.title ?? "Are you sure?",
      message: raw.message,
      confirmLabel: raw.confirmLabel ?? "Confirm",
      danger: raw.danger ?? false,
    };
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOptions(normalized);
    });
  }, []);

  function handle(result: boolean) {
    setOptions(null);
    resolver.current?.(result);
    resolver.current = null;
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={() => handle(false)}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center gap-2">
              {options.danger && <AlertTriangle size={18} className="text-red-400" />}
              <h2 className="text-sm font-semibold text-zinc-100">{options.title}</h2>
            </div>
            <p className="mb-5 whitespace-pre-wrap text-sm text-zinc-400">{options.message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handle(false)}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handle(true)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
                  options.danger ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {options.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

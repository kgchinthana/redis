"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/keys", label: "Keys" },
  { href: "/query", label: "Query" },
  { href: "/slowlog", label: "Slow Log" },
  { href: "/settings", label: "Settings" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold tracking-tight text-zinc-50">Redis Portal</span>
        <div className="flex gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active ? "bg-emerald-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
      >
        Log out
      </button>
    </nav>
  );
}

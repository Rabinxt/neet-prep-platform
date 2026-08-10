"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", glyph: "⌂" },
  { href: "/admin/questions", label: "Questions", glyph: "Q" },
  { href: "/admin/subjects", label: "Subjects", glyph: "S" },
  { href: "/admin/chapters", label: "Chapters", glyph: "C" },
  { href: "/admin/topics", label: "Topics", glyph: "T" },
  { href: "/admin/import", label: "Import", glyph: "↥" },
];

export function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const active = (href: string) => href === "/admin"
    ? pathname === href
    : pathname.startsWith(href);

  return (
    <div className="min-h-screen text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <BrandMark />
          <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Exit admin</Link>
        </div>
        <nav className="scrollbar-none flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2" aria-label="Admin navigation">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold",
              active(item.href) ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100",
            )}>{item.label}</Link>
          ))}
        </nav>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-[linear-gradient(180deg,#102e25,#081914)] text-white shadow-[12px_0_40px_rgba(8,25,20,0.08)] lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <BrandMark className="[&_span]:text-white" />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Content studio</p>
        </div>
        <nav className="flex-1 space-y-1 p-4" aria-label="Admin navigation">
          {items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
              active(item.href) ? "bg-white text-slate-950 shadow-lg" : "text-emerald-50/75 hover:bg-white/10 hover:text-white",
            )}>
              <span className={cn(
                "grid size-8 place-items-center rounded-lg border text-xs font-black",
                active(item.href) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-white/15 text-emerald-200",
              )}>{item.glyph}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate px-2 text-sm font-semibold">{user.name}</p>
          <p className="mb-3 truncate px-2 text-xs text-emerald-100/60">{user.email}</p>
          <div className="flex gap-1">
            <Link href="/dashboard" className="flex-1 rounded-lg px-2 py-2 text-center text-xs font-semibold text-emerald-50 hover:bg-white/10">Student view</Link>
            <SignOutButton className="px-2 text-xs text-emerald-50 hover:bg-white/10" />
          </div>
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}

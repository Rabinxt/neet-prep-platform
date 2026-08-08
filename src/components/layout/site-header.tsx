"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MenuIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/subjects", label: "Subjects" },
  { href: "/questions", label: "Question bank" },
  { href: "/practice", label: "Practice" },
  { href: "/mock-tests", label: "Mock tests" },
  { href: "/pyq", label: "PYQs" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <Container className="flex h-[4.5rem] items-center justify-between gap-6">
        <BrandMark />
        <nav className="hidden items-center rounded-xl bg-slate-100/80 p-1 md:flex" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                active(item.href)
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-950",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/dashboard" variant="ghost" size="sm">Dashboard</ButtonLink>
          <ButtonLink href="/practice" size="sm">Start practising</ButtonLink>
        </div>
        <details className="group relative md:hidden">
          <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="Open navigation menu">
            <MenuIcon />
          </summary>
          <div className="absolute right-0 top-12 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
            <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Explore NEET Prep</p>
            <nav className="flex flex-col" aria-label="Mobile navigation">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={cn("rounded-xl px-3 py-2.5 text-sm font-semibold", active(item.href) ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50")}>{item.label}</Link>
              ))}
              <div className="my-2 border-t border-slate-200" />
              <Link href="/dashboard" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Student dashboard</Link>
            </nav>
          </div>
        </details>
      </Container>
    </header>
  );
}

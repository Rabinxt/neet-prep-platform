"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { AwardIcon, BookIcon, HomeIcon, LayersIcon, MenuIcon, PencilIcon, TargetIcon, UserIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

const navigation: Array<{ href: string; label: string; shortLabel: string; icon: NavIcon }> = [
  { href: "/subjects", label: "Subjects", shortLabel: "Subjects", icon: LayersIcon },
  { href: "/questions", label: "Question bank", shortLabel: "Questions", icon: BookIcon },
  { href: "/practice", label: "Practice", shortLabel: "Practice", icon: PencilIcon },
  { href: "/mock-tests", label: "Mock tests", shortLabel: "Tests", icon: TargetIcon },
  { href: "/pyq", label: "PYQs", shortLabel: "PYQs", icon: AwardIcon },
];

const mobileNavigation = [
  { href: "/", label: "Home", icon: HomeIcon },
  navigation[0],
  navigation[2],
  navigation[3],
  { href: "/dashboard", label: "Me", icon: UserIcon },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const active = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const initials = session?.user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-50 bg-transparent py-2.5 md:py-3">
        <Container>
          <div className="flex h-14 items-center justify-between gap-4 rounded-[1.15rem] border border-white/80 bg-white/88 px-3 shadow-[0_10px_35px_rgba(16,33,28,0.08)] backdrop-blur-xl sm:px-4 md:h-16">
            <BrandMark />
            <nav className="hidden h-11 items-center gap-0.5 rounded-[0.9rem] bg-slate-100/75 p-1 lg:flex" aria-label="Main navigation">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={cn("group relative flex h-9 items-center gap-1.5 rounded-[0.7rem] px-2.5 text-sm font-semibold transition-all duration-200 xl:px-3", active(item.href) ? "bg-white text-slate-950 shadow-[0_4px_12px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:bg-white/60 hover:text-slate-950")}>
                    <Icon className={cn("size-4 transition-transform group-hover:scale-110", active(item.href) && "text-emerald-700")} />
                    {item.label}
                    {active(item.href) ? <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-emerald-500" /> : null}
                  </Link>
                );
              })}
            </nav>
            <div className="hidden items-center gap-1.5 md:flex">
              {isPending ? <span className="skeleton h-9 w-28 rounded-xl" aria-label="Loading account" /> : session ? (
                <>
                  {session.user.role === "ADMIN" ? <ButtonLink href="/admin" variant="ghost" size="sm">Admin</ButtonLink> : null}
                  <ButtonLink href="/dashboard" variant="ghost" size="sm"><span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-[11px] font-extrabold text-emerald-800">{initials}</span><span className="hidden xl:inline">Dashboard</span></ButtonLink>
                  <SignOutButton />
                </>
              ) : (
                <><ButtonLink href="/sign-in" variant="ghost" size="sm">Sign in</ButtonLink><ButtonLink href="/sign-up" size="sm">Join free</ButtonLink></>
              )}
            </div>
            <details className="group relative md:hidden">
              <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800" aria-label="Open navigation menu"><MenuIcon /></summary>
              <div className="absolute right-0 top-12 w-[min(19rem,calc(100vw-2rem))] rounded-[1.2rem] border border-slate-200/80 bg-white p-3 shadow-2xl">
                <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Explore NEET Prep</p>
                <nav className="flex flex-col" aria-label="Mobile navigation">
                  {navigation.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold", active(item.href) ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50")}><Icon className="size-4" />{item.label}</Link>; })}
                  <div className="my-2 border-t border-slate-200" />
                  {session ? <>{session.user.role === "ADMIN" ? <Link href="/admin" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Admin workspace</Link> : null}<Link href="/dashboard" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Student dashboard</Link><SignOutButton className="w-full rounded-xl px-3 py-2.5 text-left" /></> : <><Link href="/sign-in" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign in</Link><Link href="/sign-up" className="rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white">Create account</Link></>}
                </nav>
              </div>
            </details>
          </div>
        </Container>
      </header>

      <nav className="fixed inset-x-2 bottom-2 z-50 grid h-16 grid-cols-5 rounded-[1.2rem] border border-white/80 bg-slate-950/94 p-1.5 shadow-[0_18px_50px_rgba(2,6,23,0.35)] backdrop-blur-xl md:hidden" aria-label="Quick navigation">
        {mobileNavigation.map((item) => { const Icon = item.icon; const isActive = active(item.href); return <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className={cn("relative flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold transition-colors", isActive ? "bg-emerald-400 text-slate-950" : "text-slate-400 hover:text-white")}><Icon className={cn("size-[1.15rem]", isActive && "scale-110")} /><span>{item.label}</span></Link>; })}
      </nav>
    </>
  );
}

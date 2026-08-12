import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { Container } from "@/components/ui/container";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function DashboardHeader({ user }: { user: { name: string; email: string; role: "STUDENT" | "ADMIN" } }) {
  const initials = user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/88 backdrop-blur-xl">
      <Container className="flex h-[4.5rem] items-center justify-between gap-4">
        <BrandMark />
        <nav className="flex items-center gap-1" aria-label="Dashboard navigation">
          <Link href="/dashboard" aria-current="page" className="relative hidden cursor-pointer rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 active:scale-[0.98] sm:block">Overview<span className="nav-marker absolute inset-x-3 bottom-0 h-0.5 bg-emerald-500" /></Link>
          <Link href="/practice" className="hidden cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 active:scale-[0.98] sm:block">Practice</Link>
          {user.role === "ADMIN" ? <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Admin</Link> : null}
          <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Public site</Link>
          <span className="ml-1 hidden items-center gap-2 border-l border-slate-200 pl-3 md:flex" title={user.email}>
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-[11px] font-extrabold text-emerald-800">{initials}</span>
            <span className="max-w-32 truncate text-sm font-semibold text-slate-800">{user.name}</span>
          </span>
          <SignOutButton className="px-2 text-xs sm:px-3 sm:text-sm" />
        </nav>
      </Container>
    </header>
  );
}

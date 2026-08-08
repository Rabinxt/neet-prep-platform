import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MenuIcon } from "@/components/ui/icons";

const navigation = [
  { href: "/subjects", label: "Subjects" },
  { href: "/questions", label: "Question bank" },
  { href: "/practice", label: "Practice" },
  { href: "/mock-tests", label: "Mock tests" },
  { href: "/pyq", label: "Previous years" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <BrandMark />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/dashboard" variant="ghost" size="sm">Dashboard</ButtonLink>
          <ButtonLink href="/practice" size="sm">Start practice</ButtonLink>
        </div>
        <details className="relative md:hidden">
          <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-lg text-slate-700 hover:bg-slate-100" aria-label="Open navigation menu">
            <MenuIcon />
          </summary>
          <div className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <nav className="flex flex-col" aria-label="Mobile navigation">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  {item.label}
                </Link>
              ))}
              <div className="my-2 border-t border-slate-200" />
              <Link href="/dashboard" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-50">
                Student dashboard
              </Link>
            </nav>
          </div>
        </details>
      </Container>
    </header>
  );
}

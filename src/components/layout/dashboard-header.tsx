import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { Container } from "@/components/ui/container";

export function DashboardHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <Container className="flex h-16 items-center justify-between gap-4">
        <BrandMark />
        <nav className="flex items-center gap-1" aria-label="Dashboard navigation">
          <Link href="/dashboard" className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">Overview</Link>
          <Link href="/subjects" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:block">Practice</Link>
          <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Public site</Link>
        </nav>
      </Container>
    </header>
  );
}

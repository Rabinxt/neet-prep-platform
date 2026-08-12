import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { Container } from "@/components/ui/container";

const footerLinks = [
  { href: "/subjects", label: "Subjects" },
  { href: "/questions", label: "Question bank" },
  { href: "/practice", label: "Practice" },
  { href: "/mock-tests", label: "Mock tests" },
  { href: "/pyq", label: "Previous years" },
  { href: "/dashboard", label: "Dashboard" },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-slate-950 text-white">
      <Container className="relative py-12 sm:py-14">
        <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-start">
          <div className="max-w-md [&_span:last-child]:!text-white [&_span:last-child_span]:!text-emerald-400">
            <BrandMark />
            <p className="mt-5 text-sm leading-6 text-slate-400">A focused workspace for mastering Physics, Chemistry, and Biology—one deliberate question at a time.</p>
            <div className="mt-6 flex gap-2" aria-label="NEET subjects">
              <span className="h-1.5 w-12 rounded-full bg-sky-400" />
              <span className="h-1.5 w-12 rounded-full bg-violet-400" />
              <span className="h-1.5 w-12 rounded-full bg-emerald-400" />
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm" aria-label="Footer navigation">
            {footerLinks.map((item) => <Link key={item.href} href={item.href} className="text-slate-400 transition hover:text-white">{item.label}</Link>)}
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} NEET Prep</span>
          <span>Built for focused learning, not endless scrolling.</span>
        </div>
      </Container>
    </footer>
  );
}

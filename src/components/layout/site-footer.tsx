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
    <footer className="border-t border-slate-200 bg-white">
      <Container className="py-10">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
          <div className="max-w-sm">
            <BrandMark />
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Focused NEET preparation for steady, measurable progress in Physics, Chemistry, and Biology.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm" aria-label="Footer navigation">
            {footerLinks.map((item) => (
              <Link key={item.href} href={item.href} className="text-slate-600 hover:text-green-700">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
          © {new Date().getFullYear()} NEET Prep. Built for focused learning.
        </div>
      </Container>
    </footer>
  );
}

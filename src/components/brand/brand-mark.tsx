import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="NEET Prep home">
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-[11px] bg-[linear-gradient(145deg,#132921,#07130f)] text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">
        <svg viewBox="0 0 36 36" className="size-9" aria-hidden="true">
          <path d="M10 25V11l16 14V11" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="27" cy="9" r="2.3" className="fill-emerald-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-[-0.045em] text-slate-950">NEET<span className="text-emerald-700">Prep</span></span>
    </Link>
  );
}

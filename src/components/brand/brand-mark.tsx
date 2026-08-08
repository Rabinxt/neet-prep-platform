import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)} aria-label="NEET Prep home">
      <span className="grid size-9 place-items-center rounded-xl bg-green-700 text-sm font-bold text-white shadow-sm">
        NP
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-950">NEET Prep</span>
    </Link>
  );
}

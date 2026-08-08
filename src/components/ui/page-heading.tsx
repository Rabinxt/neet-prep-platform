import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeading({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col justify-between gap-6 lg:flex-row lg:items-end", className)}>
      <div className="max-w-3xl">
        {eyebrow && <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"><span className="h-px w-7 bg-emerald-500" />{eyebrow}</p>}
        <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

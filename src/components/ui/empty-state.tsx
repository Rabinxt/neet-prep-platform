import type { ReactNode } from "react";

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <section className="border-y border-slate-300 bg-white/55 px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        {icon && <div className="text-emerald-700 sm:border-r sm:border-slate-200 sm:pr-6 [&_svg]:size-8">{icon}</div>}
        <div><h2 className="text-xl font-bold tracking-tight text-slate-950">{title}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p></div>
        {action && <div>{action}</div>}
      </div>
    </section>
  );
}

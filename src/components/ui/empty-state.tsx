import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <Card className="border-dashed bg-white/80 p-8 text-center sm:p-12">
      {icon && <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">{icon}</div>}
      <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

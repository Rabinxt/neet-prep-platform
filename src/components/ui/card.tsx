import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[1.4rem] border border-slate-200/75 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_44px_rgba(15,23,42,0.055)] backdrop-blur-[2px]", className)}
      {...props}
    />
  );
}

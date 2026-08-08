import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export const subjectThemes: Record<string, { accent: string; soft: string; border: string; dark: string; glow: string }> = {
  physics: { accent: "text-sky-700", soft: "bg-sky-50", border: "border-sky-200", dark: "bg-[#123a63]", glow: "bg-sky-400" },
  chemistry: { accent: "text-violet-700", soft: "bg-violet-50", border: "border-violet-200", dark: "bg-[#4b2d73]", glow: "bg-violet-400" },
  biology: { accent: "text-emerald-700", soft: "bg-emerald-50", border: "border-emerald-200", dark: "bg-[#155e4a]", glow: "bg-emerald-400" },
};

export function getSubjectTheme(slug: string) {
  return subjectThemes[slug] ?? { accent: "text-slate-700", soft: "bg-slate-100", border: "border-slate-200", dark: "bg-slate-800", glow: "bg-slate-400" };
}

export function SubjectIcon({ slug, className, ...props }: SVGProps<SVGSVGElement> & { slug: string }) {
  const common = { viewBox: "0 0 48 48", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (slug === "physics") return <svg {...common} {...props} className={cn("size-8", className)}><circle cx="24" cy="24" r="3" fill="currentColor" /><ellipse cx="24" cy="24" rx="18" ry="8" /><ellipse cx="24" cy="24" rx="18" ry="8" transform="rotate(60 24 24)" /><ellipse cx="24" cy="24" rx="18" ry="8" transform="rotate(120 24 24)" /><circle cx="7" cy="22" r="2" fill="currentColor" stroke="none" /></svg>;
  if (slug === "chemistry") return <svg {...common} {...props} className={cn("size-8", className)}><path d="M18 7h12M21 7v12L11 36a4 4 0 0 0 3.7 5h18.6a4 4 0 0 0 3.7-5L27 19V7" /><path d="M16 31h16" /><circle cx="21" cy="35" r="1.5" fill="currentColor" stroke="none" /><circle cx="27" cy="27" r="1.5" fill="currentColor" stroke="none" /></svg>;
  return <svg {...common} {...props} className={cn("size-8", className)}><path d="M38 9C21 10 11 18 11 30c0 6 4 10 10 10 12 0 20-13 17-31Z" /><path d="M10 41c5-10 12-17 23-24" /><path d="M19 31c3 0 6 1 8 3M25 24c0-3 0-5-1-7" /></svg>;
}

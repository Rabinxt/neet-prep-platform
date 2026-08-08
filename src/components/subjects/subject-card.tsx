import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon, BookIcon } from "@/components/ui/icons";
import type { SubjectSummary } from "@/server/subjects/queries";
import { cn } from "@/lib/utils";

const tones: Record<string, { icon: string; badge: string }> = {
  physics: { icon: "bg-blue-100 text-blue-700", badge: "bg-blue-50 text-blue-700" },
  chemistry: { icon: "bg-violet-100 text-violet-700", badge: "bg-violet-50 text-violet-700" },
  biology: { icon: "bg-green-100 text-green-700", badge: "bg-green-50 text-green-700" },
};

const defaultTone = { icon: "bg-slate-100 text-slate-700", badge: "bg-slate-100 text-slate-700" };

export function SubjectCard({ subject }: { subject: SubjectSummary }) {
  const tone = tones[subject.slug] ?? defaultTone;

  return (
    <Card className="group flex h-full flex-col p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className={cn("grid size-11 place-items-center rounded-xl", tone.icon)}>
        <BookIcon />
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-slate-950">{subject.name}</h3>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", tone.badge)}>
          {subject.chapterCount === 0 ? "Ready to structure" : `${subject.chapterCount} chapters`}
        </span>
      </div>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{subject.description}</p>
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-sm text-slate-500">Academic hierarchy</span>
        <Link href={`/subjects/${subject.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800">
          Explore <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Card>
  );
}

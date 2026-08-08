import Link from "next/link";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { SubjectSummary } from "@/server/subjects/queries";
import { cn } from "@/lib/utils";

const subjectCopy: Record<string, string> = {
  physics: "Think in forces, fields, motion and models.",
  chemistry: "Connect reactions, structure and periodic patterns.",
  biology: "Decode living systems from cells to ecosystems.",
};

export function SubjectCard({ subject }: { subject: SubjectSummary }) {
  const tone = getSubjectTheme(subject.slug);

  return (
    <Link
      href={`/subjects/${subject.slug}`}
      className={cn(
        "group relative flex min-h-[25rem] overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.13)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(15,23,42,0.2)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 sm:p-7",
        tone.dark,
      )}
    >
      <div className="dot-field absolute inset-0 opacity-30" />
      <div className={cn("absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl transition-transform duration-500 group-hover:scale-125", tone.glow)} />
      <SubjectIcon slug={subject.slug} className="absolute -bottom-5 -right-4 size-44 rotate-[-8deg] text-white/[0.08] transition duration-500 group-hover:rotate-0 group-hover:scale-105" />
      <div className="relative flex w-full flex-col">
        <div className="flex items-start justify-between">
          <span className="grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-sm"><SubjectIcon slug={subject.slug} /></span>
          <span className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/75">NEET core</span>
        </div>
        <div className="mt-auto pt-16">
          <p className="text-sm font-medium text-white/60">{subjectCopy[subject.slug] ?? "Explore the structured syllabus."}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-[-0.04em]">{subject.name}</h3>
          <p className="mt-3 max-w-[26ch] text-sm leading-6 text-white/70">{subject.description}</p>
          <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/15 pt-5">
            <div className="flex gap-5 text-xs text-white/65">
              <span><strong className="block text-xl text-white">{subject.chapterCount}</strong>chapters</span>
              <span><strong className="block text-xl text-white">{subject.questionCount}</strong>questions</span>
            </div>
            <span className="grid size-11 place-items-center rounded-full bg-white text-slate-950 transition-transform duration-300 group-hover:translate-x-1"><ArrowRightIcon /></span>
          </div>
        </div>
      </div>
    </Link>
  );
}

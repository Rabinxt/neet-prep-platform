import Link from "next/link";
import { SubjectCard } from "@/components/subjects/subject-card";
import { SubjectIcon } from "@/components/subjects/subject-visual";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, BookIcon, ChartIcon, CheckIcon, ClockIcon, SparkIcon, TargetIcon } from "@/components/ui/icons";
import { listPublicSubjects } from "@/server/subjects/queries";

export const revalidate = 3600;

const studyModes = [
  { href: "/questions", number: "01", icon: BookIcon, title: "Learn", description: "Work through explanations without exam pressure." },
  { href: "/practice", number: "02", icon: TargetIcon, title: "Practise", description: "Build a precise set and get immediate feedback." },
  { href: "/mock-tests", number: "03", icon: ClockIcon, title: "Perform", description: "Test decisions, pace and accuracy against the clock." },
];

export default async function HomePage() {
  const { subjects } = await listPublicSubjects();
  const totalQuestions = subjects.reduce((total, subject) => total + subject.questionCount, 0);

  return (
    <>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="study-grid absolute inset-0 opacity-70" />
        <div className="ambient-orb absolute -left-32 top-20 size-80 bg-sky-500/10 blur-3xl" />
        <div className="ambient-orb absolute -right-32 bottom-0 size-96 bg-emerald-500/10 blur-3xl" />
        <Container className="relative grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="reveal-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-sm font-semibold text-emerald-300"><SparkIcon className="size-4" /> Your NEET study command centre</div>
            <h1 className="mt-7 max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Know the concept.<br /><span className="text-emerald-400">Own the answer.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">A focused workspace to turn the NEET syllabus into confident decisions across Physics, Chemistry and Biology.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/practice" size="lg" className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">Start focused practice <ArrowRightIcon className="size-4" /></ButtonLink>
              <ButtonLink href="/subjects" variant="ghost" size="lg" className="border border-white/20 text-white hover:border-white/30 hover:bg-white/10 hover:text-white">Explore the syllabus</ButtonLink>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
              {["Immediate explanations", "Persistent sessions", "Secure scoring"].map((item) => <span key={item} className="flex items-center gap-2"><CheckIcon className="size-4 text-emerald-400" />{item}</span>)}
            </div>
          </div>

          <div className="reveal-up reveal-delay-2 relative mx-auto w-full max-w-xl lg:ml-auto">
            <div className="absolute inset-8 rounded-full border border-dashed border-white/15" />
            <div className="absolute inset-20 rounded-full border border-white/10" />
            <div className="relative aspect-square sm:aspect-[1.08/1]">
              <div className="absolute left-1/2 top-1/2 grid size-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-center shadow-[0_0_80px_rgba(52,211,153,0.18)] backdrop-blur-sm after:absolute after:-inset-4 after:rounded-full after:border after:border-emerald-300/10">
                <div><strong className="block text-3xl text-white">{totalQuestions}</strong><span className="text-xs font-semibold text-emerald-300">published<br />questions</span></div>
              </div>
              {subjects.map((subject, index) => {
                const positions = ["left-0 top-[11%]", "right-0 top-[22%]", "bottom-[3%] left-[15%]"];
                const hues: Record<string, string> = { physics: "border-sky-400/30 bg-sky-400/10 text-sky-300", chemistry: "border-violet-400/30 bg-violet-400/10 text-violet-300", biology: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" };
                return <Link key={subject.slug} href={`/subjects/${subject.slug}`} className={`group absolute ${positions[index] ?? "right-0 bottom-0"} ${index === 1 ? "float-slower" : "float-slow"} w-40 rounded-2xl border p-4 backdrop-blur-sm transition duration-300 hover:brightness-125 ${hues[subject.slug] ?? "border-white/20 bg-white/10 text-white"}`}><SubjectIcon slug={subject.slug} className="size-7" /><strong className="mt-3 block text-white">{subject.name}</strong><span className="mt-1 block text-xs opacity-70">{subject.chapterCount} chapters · {subject.questionCount} Qs</span></Link>;
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <Container className="grid md:grid-cols-3">
          {studyModes.map(({ href, number, icon: Icon, title, description }, index) => (
            <Link key={href} href={href} className={`group relative flex gap-4 py-7 md:px-7 ${index > 0 ? "border-t border-slate-200 md:border-l md:border-t-0" : ""}`}>
              <span className="text-xs font-bold text-slate-300">{number}</span><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-700"><Icon className="size-5" /></span>
              <span><strong className="flex items-center gap-2 text-slate-950">{title}<ArrowRightIcon className="size-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" /></strong><span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span></span>
            </Link>
          ))}
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Three sciences. One goal.</p><h2 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.045em] text-slate-950 sm:text-5xl">Give every subject its own strategy.</h2></div><p className="max-w-sm text-sm leading-6 text-slate-600">Move from broad syllabus coverage to chapter-level precision as your preparation sharpens.</p></div>
          <div className="stagger-in mt-12 grid gap-5 md:grid-cols-3 md:[&>*:nth-child(2)]:translate-y-8">{subjects.map((subject) => <SubjectCard key={subject.slug} subject={subject} />)}</div>
        </Container>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">A tighter feedback loop</p><h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">Every answer should tell you what to do next.</h2><p className="mt-4 leading-7 text-slate-600">Study in the mode that matches the moment: understand a concept, practise it deliberately, then prove it under time pressure.</p><ButtonLink href="/questions" variant="secondary" className="mt-7">Open question bank <ArrowRightIcon className="size-4" /></ButtonLink></div>
          <div className="relative overflow-hidden rounded-[2rem] bg-[#eef8f3] p-7 sm:p-10"><div className="absolute right-0 top-0 size-48 rounded-full bg-emerald-300/20 blur-3xl" /><div className="relative grid gap-8 sm:grid-cols-3">{[
            { icon: BookIcon, value: "Learn", text: "Reveal clear explanations" },
            { icon: TargetIcon, value: "Practise", text: "Correct mistakes immediately" },
            { icon: ChartIcon, value: "Improve", text: "See a stronger score" },
          ].map(({ icon: Icon, value, text }, index) => <div key={value} className="relative"><span className="grid size-11 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm"><Icon /></span><span className="mt-5 block text-xl font-bold text-slate-950">{value}</span><span className="mt-1 block text-sm leading-5 text-slate-600">{text}</span>{index < 2 && <ArrowRightIcon className="absolute -right-5 top-3 hidden text-emerald-300 sm:block" />}</div>)}</div></div>
        </Container>
      </section>

      <section className="py-16 sm:py-20"><Container><div className="surface-lift relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 text-white sm:px-12 sm:py-14"><div className="dot-field absolute inset-0 opacity-20" /><div className="ambient-orb absolute -right-16 -top-20 size-64 bg-emerald-400/20 blur-3xl" /><div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center"><div><p className="text-sm font-bold text-emerald-400">Your next question is ready.</p><h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Don’t wait to feel prepared. Build the feeling.</h2></div><ButtonLink href="/practice" size="lg" className="shrink-0 bg-white text-slate-950 shadow-none hover:bg-emerald-50">Start practising <ArrowRightIcon className="size-4" /></ButtonLink></div></div></Container></section>
    </>
  );
}

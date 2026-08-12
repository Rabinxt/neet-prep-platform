import Link from "next/link";
import { PerformanceTrend } from "@/components/dashboard/performance-trend";
import { SubjectIcon } from "@/components/subjects/subject-visual";
import { SubjectMotif } from "@/components/subjects/subject-motif";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon, CheckIcon, ClockIcon, TargetIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { ActiveAttempt, DashboardAnalytics, RecentActivity, SubjectPerformance } from "@/server/analytics/types";

const subjectStyles: Record<string, { bar: string; field: string; text: string; border: string }> = {
  physics: { bar: "bg-sky-500", field: "bg-sky-50/55", text: "text-sky-700", border: "border-sky-400" },
  chemistry: { bar: "bg-violet-500", field: "bg-violet-50/55", text: "text-violet-700", border: "border-violet-400" },
  biology: { bar: "bg-emerald-500", field: "bg-emerald-50/55", text: "text-emerald-700", border: "border-emerald-400" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function accuracyLabel(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

function subjectFromText(value: string) {
  return ["physics", "chemistry", "biology"].find((slug) => value.toLowerCase().includes(slug)) ?? "biology";
}

export function StudentDashboard({ firstName, analytics }: { firstName: string; email: string; analytics: DashboardAnalytics }) {
  const current = analytics.activeAttempts[0];
  const strongestSubject = analytics.subjects.reduce<SubjectPerformance | undefined>((best, item) => !best || item.attempted > best.attempted ? item : best, undefined);
  const focusSlug = current ? subjectFromText(current.name) : strongestSubject?.slug ?? "biology";
  const focusStyle = subjectStyles[focusSlug] ?? subjectStyles.biology;
  const focusArea = analytics.focusAreas[0] ?? analytics.strongestArea;

  return (
    <div className="pb-8">
      <section className="relative isolate overflow-hidden border-b border-slate-300 pb-12 pt-5 sm:pb-16 lg:min-h-[34rem] lg:pb-20 lg:pt-10">
        <SubjectMotif slug={focusSlug} className={cn("absolute -right-40 top-2 -z-10 w-[34rem] opacity-[0.075] sm:-right-24 lg:right-0 lg:w-[46rem]", focusStyle.text)} />
        <div className="sequence-enter grid gap-10 lg:grid-cols-[9rem_minmax(0,1fr)_18rem] lg:gap-8">
          <div className="flex items-center gap-3 lg:block">
            <span className={cn("block h-px w-10 lg:h-20 lg:w-px", focusStyle.bar)} />
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Study home<br className="hidden lg:block" /> / Today</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-500">Hello, {firstName}. This is where you left off.</p>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.9rem,6.8vw,6.5rem)] font-black leading-[0.9] tracking-[-0.07em] text-slate-950">
              {current?.name ?? "Make the next answer count."}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
              {current
                ? `Question ${current.currentQuestion} of ${current.totalQuestions} is ready. Your saved responses are exactly where you left them.`
                : focusArea
                  ? `${focusArea.subjectName} · ${focusArea.name} is your clearest next study signal.`
                  : "A focused practice set will turn your first answers into a useful study signal."}
            </p>
            <ButtonLink href={current?.href ?? "/practice"} size="lg" className="mt-8 min-w-56 justify-between rounded-none">
              {current ? "Continue" : "Start a focused set"}<ArrowRightIcon className="size-5 transition-transform group-hover:translate-x-1" />
            </ButtonLink>
          </div>

          <div className="border-t border-slate-300 pt-6 lg:self-stretch lg:border-l lg:border-t-0 lg:pl-7 lg:pt-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Current study state</p>
            <p className="result-number mt-6 font-mono text-[clamp(4.7rem,9vw,7.5rem)] font-bold leading-[0.78] tracking-[-0.09em] text-slate-950">
              {current ? `${current.progress}%` : accuracyLabel(analytics.overview.accuracy)}
            </p>
            <p className="mt-5 text-sm font-bold text-slate-800">{current ? "set completed" : "overall accuracy"}</p>
            <div className="mt-7 h-1 bg-slate-200">
              <div className={cn("progress-fill h-full origin-left", focusStyle.bar)} style={{ transform: `scaleX(${current ? current.progress / 100 : (analytics.overview.accuracy ?? 0) / 100})` }} />
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">{current ? "One uninterrupted return is the shortest route forward." : `${analytics.overview.attempted} checked answers so far.`}</p>
          </div>
        </div>
      </section>

      {analytics.activeAttempts.length > 1 ? <ActiveAttemptRail attempts={analytics.activeAttempts} /> : null}

      <SubjectJourney subjects={analytics.subjects} />

      {!analytics.hasCompletedActivity ? (
        <NewStudentState hasActiveAttempt={analytics.activeAttempts.length > 0} />
      ) : (
        <>
          <EvidenceStrip analytics={analytics} />

          <section className="grid border-b border-slate-300 py-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:gap-14 lg:py-20">
            <div className="lg:border-r lg:border-slate-300 lg:pr-14">
              <SectionHeading eyebrow="Performance over time" title="Not a scorecard. A direction." description="Every point is a completed attempt, so the line moves only when your work does." />
              <PerformanceTrend points={analytics.trend} />
            </div>
            <FocusAreas analytics={analytics} />
          </section>

          <section className="grid gap-14 border-b border-slate-300 py-14 lg:grid-cols-[0.72fr_1.28fr] lg:py-20">
            <ChapterPerformance analytics={analytics} />
            <RecentActivityList attempts={analytics.recentActivity} />
          </section>
        </>
      )}

      <NextAction analytics={analytics} current={current} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">{eyebrow}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl">{title}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{description}</p></div>;
}

function ActiveAttemptRail({ attempts }: { attempts: ActiveAttempt[] }) {
  return <section className="border-b border-slate-300 py-7" aria-label="Other saved attempts"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Also in progress</p><div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">{attempts.slice(1).map((attempt) => <Link key={attempt.id} href={attempt.href} className="interactive-row group grid min-h-14 gap-2 px-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-bold text-slate-950">{attempt.name}</p><p className="mt-1 text-xs text-slate-500">Question {attempt.currentQuestion} of {attempt.totalQuestions}</p></div><p className="font-mono text-xl font-bold text-slate-900">{attempt.progress}%</p><ArrowRightIcon className="interaction-arrow size-5 text-emerald-700" /></Link>)}</div></section>;
}

function SubjectJourney({ subjects }: { subjects: SubjectPerformance[] }) {
  return (
    <section className="border-b border-slate-300 py-14 sm:py-20" aria-labelledby="subject-journey-heading">
      <div className="grid gap-5 lg:grid-cols-[0.42fr_1fr] lg:items-end">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Your syllabus journey</p><h2 id="subject-journey-heading" className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.055em] text-slate-950 sm:text-6xl">Three paths.<br />One preparation.</h2></div>
        <p className="max-w-xl text-sm leading-6 text-slate-500 lg:justify-self-end">Each lane grows from answers you have actually checked. Open a subject to continue from the evidence already earned.</p>
      </div>
      <div className="stagger-in mt-12">
        {subjects.map((subject, index) => {
          const style = subjectStyles[subject.slug] ?? { bar: "bg-slate-500", field: "bg-slate-50", text: "text-slate-700", border: "border-slate-400" };
          return (
            <div key={subject.slug} className={cn("relative", index === 1 && "lg:pl-[8%]", index === 2 && "lg:pl-[16%]") }>
              <Link href={`/questions?subject=${subject.slug}`} className={cn("group relative grid min-h-36 cursor-pointer overflow-hidden border-l-4 border-t border-slate-300 px-3 py-7 transition-[filter,transform,border-color] duration-200 last:border-b hover:brightness-[0.985] active:scale-[0.995] focus-visible:outline-offset-[-3px] sm:grid-cols-[3.5rem_minmax(10rem,0.55fr)_minmax(12rem,1fr)_7rem] sm:items-center sm:px-6", style.field, style.border)}>
                <SubjectMotif slug={subject.slug} className={cn("absolute -right-16 top-1/2 w-72 -translate-y-1/2 opacity-[0.07] transition-transform duration-500 group-hover:translate-x-2", style.text)} />
                <span className="relative font-mono text-xs font-bold text-slate-400">0{index + 1}</span>
                <div className="relative mt-3 flex items-center gap-3 sm:mt-0"><SubjectIcon slug={subject.slug} className={cn("size-8", style.text)} /><div><h3 className="text-2xl font-black tracking-[-0.035em] text-slate-950">{subject.name}</h3><p className="mt-1 text-xs text-slate-500">{subject.attempted} answered · {subject.correct} correct</p></div></div>
                <div className="relative mt-7 sm:mt-0"><div className="h-1 bg-white"><div className={cn("progress-fill h-full", style.bar)} style={{ transform: `scaleX(${(subject.accuracy ?? 0) / 100})` }} /></div><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Accuracy trajectory</p></div>
                <div className="relative mt-4 text-right sm:mt-0"><p className={cn("font-mono text-3xl font-bold", style.text)}>{accuracyLabel(subject.accuracy)}</p><span className={cn("mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.13em]", style.text)}>Open <ArrowRightIcon className="interaction-arrow size-3.5" /></span></div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NewStudentState({ hasActiveAttempt }: { hasActiveAttempt: boolean }) {
  return <section className="grid gap-8 border-b border-slate-300 py-14 lg:grid-cols-[0.35fr_1fr] lg:items-end lg:py-20"><p className="font-mono text-8xl font-bold tracking-[-0.08em] text-emerald-200">01</p><div><h2 className="text-4xl font-black tracking-[-0.05em] text-slate-950">{hasActiveAttempt ? "Finish the set. Reveal the signal." : "Your evidence starts with one deliberate set."}</h2><p className="mt-4 max-w-2xl leading-7 text-slate-600">Only real checked answers and submitted tests enter your preparation story.</p></div></section>;
}

function EvidenceStrip({ analytics }: { analytics: DashboardAnalytics }) {
  const practice = analytics.modes.find((mode) => mode.type === "PRACTICE");
  const mocks = analytics.modes.find((mode) => mode.type === "MOCK_EXAM");
  return (
    <section className="border-b border-slate-300 py-12 sm:py-16" aria-labelledby="evidence-heading">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Evidence so far</p>
      <h2 id="evidence-heading" className="mt-5 max-w-6xl text-3xl font-black leading-tight tracking-[-0.045em] text-slate-950 sm:text-5xl">
        <span className="text-emerald-700">{analytics.overview.attempted}</span> answers checked. <span className="text-emerald-700">{analytics.overview.correct}</span> correct. Accuracy at <span className="text-emerald-700">{accuracyLabel(analytics.overview.accuracy)}</span>.
      </h2>
      <div className="mt-9 flex flex-col gap-4 border-t border-slate-300 pt-5 text-sm sm:flex-row sm:gap-9">
        <p className="flex items-center gap-2 text-slate-600"><TargetIcon className="size-4 text-emerald-700" /><strong className="text-slate-950">{practice?.sessions ?? 0}</strong> practice sessions</p>
        <p className="flex items-center gap-2 text-slate-600"><ClockIcon className="size-4 text-blue-700" /><strong className="text-slate-950">{mocks?.sessions ?? 0}</strong> mock tests</p>
        <p className="flex items-center gap-2 text-slate-600"><CheckIcon className="size-4 text-emerald-700" /><strong className="text-slate-950">{analytics.overview.incorrect}</strong> answers ready to review</p>
      </div>
    </section>
  );
}

function FocusAreas({ analytics }: { analytics: DashboardAnalytics }) {
  return <div className="mt-12 lg:mt-0"><SectionHeading eyebrow="Next study signal" title="Where attention pays" description="A chapter appears only after enough answers make the signal useful." />{analytics.focusAreaState === "AVAILABLE" ? <ol className="mt-7 divide-y divide-slate-200 border-t border-slate-300">{analytics.focusAreas.map((area, index) => <li key={`${area.subjectSlug}:${area.slug}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4"><span className="font-mono text-xs text-slate-400">0{index + 1}</span><div><p className="font-bold text-slate-950">{area.name}</p><p className="mt-1 text-xs text-slate-500">{area.subjectName} · {area.attempted} answered</p></div><p className="font-mono text-xl font-bold text-rose-700">{area.accuracy}%</p></li>)}</ol> : <p className="mt-7 border-y border-slate-200 py-6 text-sm leading-6 text-slate-600">{analytics.focusAreaState === "NO_WEAK_AREAS" ? "No chapter currently meets the focus threshold." : "Complete more questions to identify a reliable focus area."}</p>}{analytics.strongestArea ? <p className="mt-6 border-l-2 border-emerald-500 pl-4 text-sm leading-6 text-emerald-900"><strong>{analytics.strongestArea.subjectName} · {analytics.strongestArea.name}</strong><br />Strongest supported area at {analytics.strongestArea.accuracy}%.</p> : null}</div>;
}

function ChapterPerformance({ analytics }: { analytics: DashboardAnalytics }) {
  return <section><SectionHeading eyebrow="Chapter detail" title="Supported signals" description="Chapters appear after at least two answered questions." />{analytics.chapters.length ? <div className="mt-7 divide-y divide-slate-200 border-t border-slate-300">{analytics.chapters.slice(0, 8).map((chapter) => <div key={`${chapter.subjectSlug}:${chapter.slug}`} className="grid grid-cols-[1fr_auto] gap-4 py-4"><div><p className="font-bold text-slate-950">{chapter.name}</p><p className="mt-1 text-xs text-slate-500">{chapter.subjectName} · {chapter.correct}/{chapter.attempted} correct</p></div><p className="font-mono text-xl font-bold text-slate-950">{chapter.accuracy}%</p></div>)}</div> : <p className="mt-7 border-y border-slate-200 py-6 text-sm text-slate-600">Answer two questions from the same chapter to reveal this view.</p>}</section>;
}

function RecentActivityList({ attempts }: { attempts: RecentActivity[] }) {
  return <section><SectionHeading eyebrow="Recent activity" title="The work behind the numbers" description="A chronological trail of saved and completed study sessions." /><div className="relative mt-8 before:absolute before:bottom-3 before:left-[0.42rem] before:top-3 before:w-px before:bg-slate-300">{attempts.map((attempt) => { const date = attempt.completedAt ?? attempt.updatedAt; return <Link key={attempt.id} href={attempt.href} className="interactive-row group relative -mx-3 grid min-h-16 grid-cols-[1rem_1fr_auto] gap-4 px-3 py-4"><span className={cn("relative z-10 mt-1 size-3 rounded-full border-2 bg-[#f4f7f6]", attempt.isActive ? "border-amber-500" : "border-emerald-600")} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-950">{attempt.name}</p><Badge tone={attempt.isActive ? "amber" : attempt.status === "EXPIRED" ? "violet" : "green"}>{attempt.isActive ? "Active" : attempt.status === "EXPIRED" ? "Auto-submitted" : "Completed"}</Badge></div><p className="mt-1 text-xs text-slate-500">{formatDate(date)} · {attempt.isActive ? `Question ${Math.min(attempt.currentQuestionIndex + 1, attempt.totalQuestions)} of ${attempt.totalQuestions}` : `${attempt.score}/${attempt.maximumMarks} marks · ${attempt.accuracy}% accuracy`}</p></div><ArrowRightIcon className="interaction-arrow size-4 self-center text-emerald-700" /></Link>; })}</div></section>;
}

function NextAction({ analytics, current }: { analytics: DashboardAnalytics; current: ActiveAttempt | undefined }) {
  const focus = analytics.focusAreas[0];
  return <section className="grid gap-8 py-14 sm:py-20 lg:grid-cols-[0.35fr_1fr_auto] lg:items-end"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Next useful move</p><div><h2 className="text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">{current ? "Return while the context is fresh." : focus ? `Revisit ${focus.name}.` : "Create your first reliable signal."}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{current ? current.name : focus ? `${focus.subjectName} is currently the clearest supported opportunity.` : "A short practice set is enough to begin."}</p></div><ButtonLink href={current?.href ?? (focus ? `/questions?subject=${focus.subjectSlug}` : "/practice")} size="lg" className="rounded-none">{current ? "Continue" : focus ? "Open subject" : "Start practice"}<ArrowRightIcon className="interaction-arrow size-5" /></ButtonLink></section>;
}

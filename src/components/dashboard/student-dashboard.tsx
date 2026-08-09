import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon, BookIcon, ChartIcon, CheckIcon, ClockIcon, TargetIcon } from "@/components/ui/icons";
import { PerformanceTrend } from "@/components/dashboard/performance-trend";
import type {
  ActiveAttempt,
  DashboardAnalytics,
  ModePerformance,
  RecentActivity,
  SubjectPerformance,
} from "@/server/analytics/types";

const subjectStyles: Record<string, { bar: string; bg: string; text: string; accent: string }> = {
  physics: { bar: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-800", accent: "border-blue-200" },
  chemistry: { bar: "bg-violet-500", bg: "bg-violet-50", text: "text-violet-800", accent: "border-violet-200" },
  biology: { bar: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-800", accent: "border-emerald-200" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function accuracyLabel(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

export function StudentDashboard({
  firstName,
  email,
  analytics,
}: {
  firstName: string;
  email: string;
  analytics: DashboardAnalytics;
}) {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden bg-slate-950 px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="study-grid absolute inset-0 opacity-60" />
        <div className="absolute -right-20 -top-28 size-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Your preparation workspace</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-[-0.045em] text-white sm:text-5xl">Welcome back, {firstName}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Real performance from your completed Practice sessions and Mock Tests. Signed in as {email}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/practice" className="bg-white text-slate-950 shadow-none hover:bg-emerald-50">Start Practice</ButtonLink>
            <ButtonLink href="/mock-tests" variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/15">Take Mock Test</ButtonLink>
            <ButtonLink href="/questions" variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white">Browse Questions</ButtonLink>
          </div>
        </div>
      </section>

      {analytics.activeAttempts.length > 0 ? <ContinueStudying attempts={analytics.activeAttempts} /> : null}

      {!analytics.hasCompletedActivity ? (
        <NewStudentState hasActiveAttempt={analytics.activeAttempts.length > 0} />
      ) : (
        <>
          <Overview analytics={analytics} />
          <ModeComparison modes={analytics.modes} />
          <SubjectComparison subjects={analytics.subjects} />

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <Card className="border-0 p-5 sm:p-7">
              <SectionHeading eyebrow="Last completed attempts" title="Performance trend" description="Accuracy is correct answers divided by answered questions for each completed attempt." />
              <PerformanceTrend points={analytics.trend} />
            </Card>
            <FocusAreas analytics={analytics} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
            <ChapterPerformance analytics={analytics} />
            <RecentActivityList attempts={analytics.recentActivity} />
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-bold tracking-[-0.025em] text-slate-950 sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function ContinueStudying({ attempts }: { attempts: ActiveAttempt[] }) {
  return (
    <section className="border-l-4 border-emerald-500 bg-emerald-50/70 px-5 py-5 sm:px-7" aria-labelledby="continue-heading">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Continue studying</p>
          <h2 id="continue-heading" className="mt-1 text-xl font-bold text-slate-950">Pick up where you left off</h2>
        </div>
        <p className="text-sm text-emerald-800">Your current position and saved answers are waiting.</p>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {attempts.map((attempt) => (
          <Link key={attempt.id} href={attempt.href} className="group bg-white p-4 shadow-sm ring-1 ring-emerald-200 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge tone={attempt.type === "PRACTICE" ? "green" : "blue"}>{attempt.type === "PRACTICE" ? "Practice" : "Mock Test"}</Badge>
                <h3 className="mt-3 truncate font-bold text-slate-950">{attempt.name}</h3>
                <p className="mt-1 text-sm text-slate-500">Question {attempt.currentQuestion} of {attempt.totalQuestions}</p>
              </div>
              <ArrowRightIcon className="mt-1 size-5 shrink-0 text-emerald-700 transition-transform group-hover:translate-x-1" />
            </div>
            <div className="mt-4 h-1.5 overflow-hidden bg-emerald-100"><div className="h-full bg-emerald-600" style={{ width: `${attempt.progress}%` }} /></div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function NewStudentState({ hasActiveAttempt }: { hasActiveAttempt: boolean }) {
  return (
    <section className="relative overflow-hidden border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10 sm:py-14">
      <div className="dot-field absolute inset-0 opacity-[0.08]" />
      <div className="relative mx-auto max-w-2xl">
        <span className="mx-auto grid size-14 place-items-center bg-emerald-100 text-emerald-700"><ChartIcon className="size-7" /></span>
        <h2 className="mt-5 text-2xl font-bold tracking-[-0.03em] text-slate-950">{hasActiveAttempt ? "Complete your first set to unlock insights" : "Your first insight starts with one focused set"}</h2>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">We will use only your real checked Practice answers and submitted Mock Tests. No invented rank, percentile, or comparison data.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/practice">Start Practice</ButtonLink>
          <ButtonLink href="/mock-tests" variant="secondary">Take Mock Test</ButtonLink>
        </div>
      </div>
    </section>
  );
}

function Overview({ analytics }: { analytics: DashboardAnalytics }) {
  const metrics = [
    { label: "Questions answered", value: analytics.overview.attempted, note: "Across completed attempts", icon: TargetIcon, tone: "text-blue-700 bg-blue-50" },
    { label: "Correct answers", value: analytics.overview.correct, note: "Checked or submitted", icon: CheckIcon, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Incorrect answers", value: analytics.overview.incorrect, note: "Useful learning signals", icon: BookIcon, tone: "text-rose-700 bg-rose-50" },
    { label: "Overall accuracy", value: accuracyLabel(analytics.overview.accuracy), note: "Correct ÷ answered", icon: ChartIcon, tone: "text-violet-700 bg-violet-50" },
    { label: "Practice completed", value: analytics.overview.practiceSessions, note: "Terminal sessions", icon: BookIcon, tone: "text-amber-700 bg-amber-50" },
    { label: "Mock Tests completed", value: analytics.overview.mockTests, note: "Submitted or auto-submitted", icon: ClockIcon, tone: "text-cyan-700 bg-cyan-50" },
  ];
  return (
    <section aria-labelledby="overview-heading">
      <SectionHeading eyebrow="All-time overview" title="Your numbers, without the noise" description="Abandoned attempts, unchecked Practice selections, and unanswered questions are excluded from accuracy." />
      <h2 id="overview-heading" className="sr-only">Performance overview</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map(({ label, value, note, icon: Icon, tone }) => (
          <Card key={label} className="border-0 p-4 sm:p-5">
            <span className={`grid size-9 place-items-center ${tone}`}><Icon className="size-4" /></span>
            <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{value}</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{note}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ModeComparison({ modes }: { modes: ModePerformance[] }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2" aria-label="Practice and Mock Test comparison">
      {modes.map((mode) => {
        const practice = mode.type === "PRACTICE";
        return (
          <div key={mode.type} className={`border-l-4 p-5 sm:p-6 ${practice ? "border-emerald-500 bg-emerald-50/70" : "border-blue-500 bg-blue-50/70"}`}>
            <div className="flex items-start justify-between gap-4">
              <div><p className={`text-xs font-bold uppercase tracking-[0.16em] ${practice ? "text-emerald-700" : "text-blue-700"}`}>{practice ? "Learning mode" : "Exam mode"}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{practice ? "Practice" : "Mock Tests"}</h2></div>
              <p className="text-3xl font-bold text-slate-950">{accuracyLabel(mode.accuracy)}</p>
            </div>
            {mode.sessions === 0 ? (
              <p className="mt-5 border-t border-slate-900/10 pt-4 text-sm text-slate-600">No completed {practice ? "Practice sessions" : "Mock Tests"} yet.</p>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-slate-500">Sessions</p><p className="mt-1 font-bold text-slate-900">{mode.sessions}</p></div>
                <div><p className="text-slate-500">Answered</p><p className="mt-1 font-bold text-slate-900">{mode.attempted}</p></div>
                <div><p className="text-slate-500">Marks</p><p className="mt-1 font-bold text-slate-900">{mode.score}/{mode.maximumMarks}</p></div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function SubjectComparison({ subjects }: { subjects: SubjectPerformance[] }) {
  return (
    <Card className="border-0 p-5 sm:p-7">
      <SectionHeading eyebrow="Subject comparison" title="See where your answers are landing" description="Marks and subject names come from immutable attempt snapshots, not the current question bank." />
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {subjects.map((subject) => {
          const style = subjectStyles[subject.slug] ?? { bar: "bg-slate-500", bg: "bg-slate-50", text: "text-slate-800", accent: "border-slate-200" };
          return (
            <div key={subject.slug} className={`border-t-4 ${style.accent} ${style.bg} p-5`}>
              <div className="flex items-end justify-between gap-3"><div><p className={`font-bold ${style.text}`}>{subject.name}</p><p className="mt-1 text-sm text-slate-500">{subject.attempted} answered · {subject.correct} correct</p></div><p className="text-3xl font-bold text-slate-950">{accuracyLabel(subject.accuracy)}</p></div>
              <div className="mt-5 h-2 overflow-hidden bg-white/80" aria-hidden="true"><div className={`h-full ${style.bar}`} style={{ width: `${subject.accuracy ?? 0}%` }} /></div>
              <div className="mt-4 flex justify-between text-xs text-slate-500"><span>{subject.incorrect} incorrect</span><span className="font-semibold text-slate-700">{subject.score}/{subject.maximumMarks} marks</span></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function FocusAreas({ analytics }: { analytics: DashboardAnalytics }) {
  return (
    <Card className="border-0 p-5 sm:p-7">
      <SectionHeading eyebrow="Evidence-based guidance" title="Focus areas" description="A chapter needs at least 3 answered questions and accuracy below 60% before it appears here." />
      {analytics.focusAreaState === "AVAILABLE" ? (
        <div className="mt-6 divide-y divide-slate-100">
          {analytics.focusAreas.map((area) => (
            <div key={`${area.subjectSlug}:${area.slug}`} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <span className="grid size-11 shrink-0 place-items-center bg-rose-50 text-sm font-extrabold text-rose-700">{area.accuracy}%</span>
              <div className="min-w-0"><p className="truncate font-bold text-slate-900">{area.name}</p><p className="mt-1 text-sm text-slate-500">{area.subjectName} · {area.attempted} answered</p></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 bg-slate-50 p-5">
          <p className="font-semibold text-slate-900">{analytics.focusAreaState === "NO_WEAK_AREAS" ? "No chapter currently meets the focus threshold." : "Complete more questions to identify your focus areas."}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">We never call a chapter weak from a single answer.</p>
        </div>
      )}
      {analytics.strongestArea ? (
        <div className="mt-5 border-l-4 border-emerald-400 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Strongest supported area</p>
          <p className="mt-2 font-bold text-emerald-950">{analytics.strongestArea.subjectName} · {analytics.strongestArea.name}</p>
          <p className="mt-1 text-sm text-emerald-800">{analytics.strongestArea.accuracy}% across {analytics.strongestArea.attempted} answered questions</p>
        </div>
      ) : null}
    </Card>
  );
}

function ChapterPerformance({ analytics }: { analytics: DashboardAnalytics }) {
  return (
    <Card className="border-0 p-5 sm:p-7">
      <SectionHeading eyebrow="Chapter detail" title="Performance with enough signal" description="Chapters appear after at least 2 answered questions. Focus labels require 3." />
      {analytics.chapters.length > 0 ? (
        <div className="mt-6 divide-y divide-slate-100">
          {analytics.chapters.slice(0, 8).map((chapter) => (
            <div key={`${chapter.subjectSlug}:${chapter.slug}`} className="grid grid-cols-[1fr_auto] gap-4 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0"><p className="truncate font-bold text-slate-900">{chapter.name}</p><p className="mt-1 text-sm text-slate-500">{chapter.subjectName} · {chapter.correct}/{chapter.attempted} correct</p></div>
              <div className="flex items-center gap-3"><div className="hidden h-1.5 w-20 overflow-hidden bg-slate-100 sm:block"><div className="h-full bg-emerald-500" style={{ width: `${chapter.accuracy}%` }} /></div><span className="w-11 text-right font-bold text-slate-900">{chapter.accuracy}%</span></div>
            </div>
          ))}
        </div>
      ) : <p className="mt-6 bg-slate-50 p-5 text-sm leading-6 text-slate-600">Answer at least two questions from the same chapter to unlock chapter-level performance.</p>}
    </Card>
  );
}

function RecentActivityList({ attempts }: { attempts: RecentActivity[] }) {
  return (
    <Card className="border-0 p-5 sm:p-7">
      <SectionHeading eyebrow="Recent activity" title="Return to any saved result" description="The latest eight active or finalized attempts owned by your account." />
      <div className="mt-6 divide-y divide-slate-100">
        {attempts.map((attempt) => {
          const activityDate = attempt.completedAt ?? attempt.updatedAt;
          return (
            <Link key={attempt.id} href={attempt.href} className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <span className={`grid size-11 shrink-0 place-items-center ${attempt.type === "PRACTICE" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{attempt.type === "PRACTICE" ? <BookIcon className="size-5" /> : <ClockIcon className="size-5" />}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold text-slate-900">{attempt.name}</p><Badge tone={attempt.isActive ? "amber" : attempt.status === "EXPIRED" ? "violet" : "green"}>{attempt.isActive ? "Active" : attempt.status === "EXPIRED" ? "Auto-submitted" : "Completed"}</Badge></div>
                <p className="mt-1 text-xs text-slate-500">{formatDate(activityDate)} · {attempt.isActive ? `Question ${Math.min(attempt.currentQuestionIndex + 1, attempt.totalQuestions)} of ${attempt.totalQuestions}` : `${attempt.score}/${attempt.maximumMarks} marks · ${attempt.accuracy}% accuracy`}</p>
              </div>
              <span className="hidden text-sm font-semibold text-emerald-700 sm:block">{attempt.isActive ? "Resume" : "Review"}</span>
              <ArrowRightIcon className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-emerald-700" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

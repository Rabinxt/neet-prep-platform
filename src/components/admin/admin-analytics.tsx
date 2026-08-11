import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartIcon } from "@/components/ui/icons";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";
import { cn } from "@/lib/utils";
import type { AdminAnalytics } from "@/server/admin/analytics-calculate";

const subjectBars: Record<string, string> = {
  physics: "bg-sky-500",
  chemistry: "bg-violet-500",
  biology: "bg-emerald-500",
};

const difficultyStyles = {
  EASY: { bar: "bg-emerald-500", text: "text-emerald-700" },
  MEDIUM: { bar: "bg-amber-500", text: "text-amber-700" },
  HARD: { bar: "bg-rose-500", text: "text-rose-700" },
};

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(value));
}

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function SubjectMark({ slug }: { slug: string }) {
  const tone = getSubjectTheme(slug);
  return <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tone.soft, tone.accent)}><SubjectIcon slug={slug} className="size-5" /></span>;
}

export function AdminAnalyticsView({ analytics }: { analytics: AdminAnalytics }) {
  if (!analytics.hasCompletedActivity) {
    return <div className="space-y-8"><PageIntro /><EmptyState icon={<ChartIcon />} title="Analytics begin with completed attempts" description="Chapter demand, answer accuracy, and participation will appear after students complete Practice sessions or submit Mock Tests. In-progress and abandoned work is not presented as performance data." /></div>;
  }

  const maxChapterAttempts = Math.max(...analytics.chapterVolume.map((chapter) => chapter.attemptCount), 1);
  const maxSubjectAttempts = Math.max(...analytics.subjects.map((subject) => subject.attemptCount), 1);
  const weekEndInclusive = new Date(new Date(analytics.week.currentEnd).getTime() - 1).toISOString();

  return (
    <div className="space-y-12">
      <PageIntro />

      <section className="reveal-up grid gap-9 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-stretch" aria-labelledby="chapter-demand-heading">
        <div className="border-y border-slate-300 py-7 sm:py-9">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Primary signal</p><h2 id="chapter-demand-heading" className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Where students are spending attempts</h2></div>
            <p className="max-w-xs text-sm leading-6 text-slate-500">Ranked by distinct completed or expired attempts containing a resolved answer in each chapter.</p>
          </div>

          {analytics.chapterVolume.length ? (
            <ol className="stagger-in mt-8 space-y-5">
              {analytics.chapterVolume.map((chapter, index) => {
                const strength = chapter.attemptCount / maxChapterAttempts;
                const tone = getSubjectTheme(chapter.subjectSlug);
                return <li key={`${chapter.subjectSlug}:${chapter.chapterSlug}`} className="group grid gap-2 sm:grid-cols-[2rem_minmax(9rem,0.42fr)_minmax(12rem,1fr)_5rem] sm:items-center sm:gap-4"><span className="font-mono text-xs font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><p className="truncate font-bold text-slate-950">{chapter.chapterName}</p><p className={cn("mt-0.5 text-xs font-semibold", tone.accent)}>{chapter.subjectName}</p></div><div className={cn("h-3 overflow-hidden rounded-sm", tone.soft)} aria-hidden="true"><div className={cn("h-full origin-left rounded-sm transition-[width,opacity] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:brightness-110", subjectBars[chapter.subjectSlug] ?? "bg-slate-500")} style={{ width: `${Math.max(7, strength * 100)}%`, opacity: 0.42 + strength * 0.58 }} /></div><p className="text-left sm:text-right"><strong className="text-lg text-slate-950">{chapter.attemptCount}</strong><span className="ml-1 text-xs text-slate-500">attempt{chapter.attemptCount === 1 ? "" : "s"}</span><span className="sr-only"> in {chapter.chapterName}, {chapter.subjectName}</span></p></li>;
              })}
            </ol>
          ) : <p className="mt-8 border-l-4 border-slate-300 pl-4 text-sm leading-6 text-slate-500">Completed attempts exist, but none contain resolved chapter answers yet.</p>}
        </div>

        <aside className="flex flex-col justify-between border-slate-300 xl:border-l xl:pl-8" aria-label="Weekly attempt summary">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{formatDay(analytics.week.currentStart)}–{formatDay(weekEndInclusive)}</p><p className="mt-5 text-7xl font-black leading-none tracking-[-0.075em] text-slate-950 sm:text-8xl">{analytics.hero.attemptsThisWeek}</p><p className="mt-3 max-w-[14rem] text-lg font-bold leading-6 text-slate-800">attempts started this week</p><p className="mt-3 text-sm leading-6 text-slate-500">{analytics.hero.change === null ? `${analytics.hero.attemptsPreviousWeek} in the previous week; no percentage baseline yet.` : `${analytics.hero.change >= 0 ? "+" : ""}${analytics.hero.change}% against ${analytics.hero.attemptsPreviousWeek} last week.`}</p></div>
          <dl className="mt-9 divide-y divide-slate-200 border-y border-slate-200 text-sm"><div className="flex items-center justify-between gap-4 py-3"><dt className="text-slate-500">Active students</dt><dd className="font-black text-slate-950">{analytics.hero.activeStudentsThisWeek}</dd></div><div className="flex items-center justify-between gap-4 py-3"><dt className="text-slate-500">Resolved completion</dt><dd className="font-black text-slate-950">{analytics.hero.completionRate === null ? "—" : `${analytics.hero.completionRate}%`}</dd></div></dl>
        </aside>
      </section>

      <section className="grid gap-10 xl:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]"><RankedAccuracy chapters={analytics.chapterAccuracy} /><SubjectParticipation subjects={analytics.subjects} maximum={maxSubjectAttempts} /></section>
      <section className="grid gap-10 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]"><DifficultyDistribution rows={analytics.difficulty} /><MostActiveStudents students={analytics.activeStudents} /></section>
      <section className="grid gap-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]"><IncorrectQuestions questions={analytics.incorrectQuestions} /><RecentActivity attempts={analytics.recentAttempts} /></section>
    </div>
  );
}

function PageIntro() {
  return <header className="relative overflow-hidden border-b border-slate-200 pb-8"><div className="ambient-orb absolute -right-16 -top-24 size-64 bg-emerald-200/40 blur-3xl" /><Badge tone="green">ADMIN ANALYTICS</Badge><div className="relative mt-4 max-w-4xl"><h1 className="text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl">See what students actually practise.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Platform-wide signals from immutable attempt snapshots, with unfinished work kept separate from evaluated performance.</p></div></header>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p><h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">{title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p></div>;
}

function RankedAccuracy({ chapters }: { chapters: AdminAnalytics["chapterAccuracy"] }) {
  return <section aria-label="Chapter accuracy ranking"><SectionHeading eyebrow="Accuracy pressure" title="Chapters needing the closest look" description="Lowest answered-question accuracy first; chapters need at least two resolved answers to appear." />{chapters.length ? <ol className="mt-6 divide-y divide-slate-200 border-y border-slate-200">{chapters.map((chapter, index) => { const tone = getSubjectTheme(chapter.subjectSlug); return <li key={`${chapter.subjectSlug}:${chapter.chapterSlug}`} className="grid gap-3 py-4 sm:grid-cols-[2rem_1fr_7rem_4rem] sm:items-center"><span className="font-mono text-xs font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span><div className="flex min-w-0 items-center gap-3"><SubjectMark slug={chapter.subjectSlug} /><div className="min-w-0"><p className="truncate font-bold text-slate-950">{chapter.chapterName}</p><p className={cn("text-xs font-semibold", tone.accent)}>{chapter.subjectName} · {chapter.answered} answered</p></div></div><div className="h-1.5 overflow-hidden bg-slate-100"><div className={cn("h-full", subjectBars[chapter.subjectSlug] ?? "bg-slate-500")} style={{ width: `${chapter.accuracy}%` }} /></div><p className="text-right text-lg font-black text-slate-950">{chapter.accuracy}%</p></li>; })}</ol> : <p className="mt-6 border-y border-slate-200 py-6 text-sm text-slate-500">More resolved chapter answers are needed before accuracy can be ranked.</p>}</section>;
}

function SubjectParticipation({ subjects, maximum }: { subjects: AdminAnalytics["subjects"]; maximum: number }) {
  return <section><SectionHeading eyebrow="Participation" title="Subject reach" description="Distinct terminal attempts containing at least one resolved answer in each subject." />{subjects.length ? <div className="mt-6 space-y-6 border-y border-slate-200 py-6">{subjects.map((subject) => { const tone = getSubjectTheme(subject.subjectSlug); return <div key={subject.subjectSlug}><div className="flex items-end justify-between gap-4"><div className="flex items-center gap-3"><SubjectMark slug={subject.subjectSlug} /><div><p className="font-bold text-slate-950">{subject.subjectName}</p><p className="text-xs text-slate-500">{subject.answered} answered questions</p></div></div><p className={cn("text-2xl font-black", tone.accent)}>{subject.attemptCount}</p></div><div className={cn("mt-3 h-2 overflow-hidden", tone.soft)}><div className={cn("h-full", subjectBars[subject.subjectSlug] ?? "bg-slate-500")} style={{ width: `${Math.max(5, (subject.attemptCount / maximum) * 100)}%` }} /></div></div>; })}</div> : <p className="mt-6 border-y border-slate-200 py-6 text-sm text-slate-500">No subject participation is available yet.</p>}</section>;
}

function DifficultyDistribution({ rows }: { rows: AdminAnalytics["difficulty"] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return <section><SectionHeading eyebrow="Question mix" title="Difficulty distribution" description="The share of resolved snapshot questions across terminal attempts." />{total ? <><div className="mt-7 flex h-3 overflow-hidden rounded-sm" role="img" aria-label={rows.map((row) => `${row.difficulty.toLowerCase()} ${row.share}%`).join(", ")}>{rows.map((row) => <span key={row.difficulty} className={difficultyStyles[row.difficulty].bar} style={{ width: `${row.share}%` }} />)}</div><dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200">{rows.map((row) => <div key={row.difficulty} className="flex items-center justify-between gap-4 py-3"><dt className={cn("text-sm font-bold", difficultyStyles[row.difficulty].text)}>{row.difficulty.toLowerCase()}</dt><dd><strong className="text-lg text-slate-950">{row.count}</strong><span className="ml-2 text-xs text-slate-500">{row.share}%</span></dd></div>)}</dl></> : <p className="mt-6 text-sm text-slate-500">No resolved difficulty data is available.</p>}</section>;
}

function MostActiveStudents({ students }: { students: AdminAnalytics["activeStudents"] }) {
  return <section><SectionHeading eyebrow="Student activity" title="Most active students" description="Registered students ranked by non-abandoned attempts across all time." />{students.length ? <ol className="mt-6 divide-y divide-slate-200 border-y border-slate-200">{students.map((student, index) => <li key={student.userId} className="flex items-center gap-4 py-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-950 font-mono text-xs font-bold text-white">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-950">{student.name}</p><p className="mt-0.5 text-xs text-slate-400">Registered student</p></div><p className="shrink-0 text-right"><strong className="text-xl text-slate-950">{student.attemptCount}</strong><span className="ml-1 text-xs text-slate-500">attempts</span></p></li>)}</ol> : <p className="mt-6 border-y border-slate-200 py-6 text-sm text-slate-500">No registered student activity is available yet.</p>}</section>;
}

function IncorrectQuestions({ questions }: { questions: AdminAnalytics["incorrectQuestions"] }) {
  return <section><SectionHeading eyebrow="Question quality signal" title="Highest incorrect-answer rates" description="Only questions with at least three resolved answers appear; ranking uses immutable snapshots." />{questions.length ? <ol className="mt-6 divide-y divide-slate-200 border-y border-slate-200">{questions.map((question, index) => { const tone = getSubjectTheme(question.subjectSlug); return <li key={`${question.sourceQuestionId ?? "snapshot"}:${question.questionText}`} className="grid gap-3 py-4 sm:grid-cols-[2rem_minmax(0,1fr)_6rem] sm:items-center"><span className="font-mono text-xs font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><p className="line-clamp-2 text-sm font-bold leading-6 text-slate-900">{question.questionText}</p><p className={cn("mt-1 text-xs font-semibold", tone.accent)}>{question.subjectName} · {question.chapterName} · {question.answered} answers</p></div><p className="text-left sm:text-right"><strong className="text-2xl text-rose-700">{question.incorrectRate}%</strong><span className="block text-xs text-slate-500">incorrect</span></p></li>; })}</ol> : <p className="mt-6 border-y border-slate-200 py-6 text-sm text-slate-500">No question has reached the minimum of three resolved answers yet.</p>}</section>;
}

function RecentActivity({ attempts }: { attempts: AdminAnalytics["recentAttempts"] }) {
  return <section><SectionHeading eyebrow="Latest activity" title="Recent attempts" description="The twenty most recently updated non-abandoned attempts." /><div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">{attempts.map((attempt) => <article key={attempt.id} className="py-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge tone={attempt.type === "PRACTICE" ? "green" : "blue"}>{attempt.type === "PRACTICE" ? "Practice" : "Mock test"}</Badge><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{attempt.status.toLowerCase()}</span></div><h3 className="mt-2 truncate text-sm font-bold text-slate-950">{attempt.name}</h3><p className="mt-1 text-xs text-slate-500">{attempt.user?.name ?? "Anonymous student"} · {attempt.attemptedQuestions}/{attempt.totalQuestions} answered</p></div><time className="shrink-0 text-xs text-slate-400" dateTime={attempt.updatedAt}>{formatActivityTime(attempt.updatedAt)}</time></div></article>)}</div></section>;
}

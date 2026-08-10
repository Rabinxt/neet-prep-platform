import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { getAdminOverview } from "@/server/admin/questions";
import { requireAdmin } from "@/server/auth/session";

export const metadata: Metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  await requireAdmin();
  const stats = await getAdminOverview();
  const core = new Map(stats.subjectCounts.map((item) => [item.slug, item.questions]));
  const metrics = [
    { label: "Total questions", value: stats.totalQuestions, tone: "bg-slate-950 text-white" },
    { label: "Published", value: stats.publishedQuestions, tone: "bg-emerald-700 text-white" },
    { label: "Unpublished", value: stats.unpublishedQuestions, tone: "bg-amber-100 text-amber-950" },
    { label: "Subjects", value: stats.subjects, tone: "bg-white text-slate-950" },
    { label: "Chapters", value: stats.chapters, tone: "bg-white text-slate-950" },
    { label: "Topics", value: stats.topics, tone: "bg-white text-slate-950" },
  ];
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden border-b border-slate-200 pb-8">
        <div className="absolute right-0 top-0 size-40 rounded-full bg-emerald-200/40 blur-3xl" />
        <Badge tone="green">ADMIN WORKSPACE</Badge>
        <div className="relative mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">Keep every question trustworthy.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Manage the live NEET taxonomy and future-session content without changing immutable student attempt history.</p>
          </div>
          <ButtonLink href="/admin/questions/new">Add question <span aria-hidden>→</span></ButtonLink>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Content counts">
        {metrics.map((metric) => (
          <div key={metric.label} className={`min-h-32 border border-slate-200 p-5 shadow-sm ${metric.tone}`}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-65">{metric.label}</p>
            <p className="mt-6 text-4xl font-black tracking-tight">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Coverage</p><h2 className="mt-1 text-xl font-black">Core subject balance</h2></div>
            <Link href="/admin/questions" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">View questions</Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { slug: "physics", name: "Physics", color: "bg-blue-500" },
              { slug: "chemistry", name: "Chemistry", color: "bg-violet-500" },
              { slug: "biology", name: "Biology", color: "bg-emerald-500" },
            ].map((subject) => {
              const value = core.get(subject.slug) ?? 0;
              const share = stats.totalQuestions ? Math.round((value / stats.totalQuestions) * 100) : 0;
              return <div key={subject.slug}>
                <div className="flex items-end justify-between"><span className="font-bold">{subject.name}</span><span className="text-2xl font-black">{value}</span></div>
                <div className="mt-3 h-2 overflow-hidden bg-slate-100"><div className={`h-full ${subject.color}`} style={{ width: `${share}%` }} /></div>
                <p className="mt-2 text-xs text-slate-500">{share}% of question bank</p>
              </div>;
            })}
          </div>
        </div>
        <div className="border border-slate-800 bg-slate-950 p-6 text-white shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Quick actions</p>
          <div className="mt-5 divide-y divide-white/10">
            {[
              ["Create a question", "/admin/questions/new"],
              ["Review and publish", "/admin/questions?publication=unpublished"],
              ["Manage hierarchy", "/admin/subjects"],
              ["Validate JSON import", "/admin/import"],
            ].map(([label, href]) => <Link key={href} href={href} className="flex items-center justify-between py-4 font-semibold text-slate-100 hover:text-emerald-300"><span>{label}</span><span aria-hidden>↗</span></Link>)}
          </div>
        </div>
      </section>
    </div>
  );
}

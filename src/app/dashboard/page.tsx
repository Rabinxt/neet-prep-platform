import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, BookIcon, ChartIcon, ClockIcon, TargetIcon } from "@/components/ui/icons";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Student Dashboard",
  description: "Your NEET study overview and next steps.",
};

const metrics = [
  { label: "Questions practised", value: "—", note: "Start your first session", icon: TargetIcon },
  { label: "Current accuracy", value: "—", note: "No activity yet", icon: ChartIcon },
  { label: "Study time", value: "0m", note: "This week", icon: ClockIcon },
];

const nextSteps = [
  { subject: "Physics", task: "Review Laws of Motion", detail: "Sample study recommendation", href: "/subjects/physics", tone: "bg-blue-100 text-blue-700" },
  { subject: "Chemistry", task: "Explore Chemical Bonding", detail: "Sample study recommendation", href: "/subjects/chemistry", tone: "bg-violet-100 text-violet-700" },
  { subject: "Biology", task: "Revise Human Physiology", detail: "Sample study recommendation", href: "/subjects/biology", tone: "bg-green-100 text-green-700" },
];

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const firstName = user.name.trim().split(/\s+/)[0] || "there";
  return (
    <Container className="py-8 sm:py-12">
      <div className="relative -mx-1 mb-8 overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-8 text-white sm:px-9"><div className="study-grid absolute inset-0 opacity-50" /><div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-400">Student dashboard</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">Good to see you, {firstName}. Let&apos;s make today count.</h1>
          <p className="mt-2 text-slate-400">Signed in as {user.email}. Your account is ready; your performance dashboard is coming next.</p>
        </div>
      </div>
      <ButtonLink href="/practice" className="shrink-0 bg-white text-slate-950 shadow-none hover:bg-emerald-50">Start practice <ArrowRightIcon className="size-4" /></ButtonLink>
      </div></div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <Card key={label} className="group border-0 p-5 transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p></div>
              <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon className="size-5" /></span>
            </div>
            <p className="mt-3 text-xs text-slate-500">{note}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        <Card className="overflow-hidden border-0 p-6">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="text-lg font-bold text-slate-950">Suggested next steps</h2><p className="mt-1 text-sm text-slate-500">Sample content for the dashboard foundation</p></div>
            <Link href="/subjects" className="text-sm font-semibold text-green-700 hover:text-green-800">All subjects</Link>
          </div>
          <div className="mt-6 divide-y divide-slate-100">
            {nextSteps.map((item) => (
              <Link key={item.subject} href={item.href} className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.tone}`}><BookIcon className="size-5" /></span>
                <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{item.task}</p><p className="mt-1 text-sm text-slate-500">{item.subject} · {item.detail}</p></div>
                <ArrowRightIcon className="size-5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-green-700" />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-[#eef8f3] p-6">
          <h2 className="text-lg font-bold text-slate-950">Weekly goal</h2>
          <p className="mt-1 text-sm text-slate-500">Practise consistently to build momentum.</p>
          <div className="mt-7 flex items-end justify-between"><span className="text-4xl font-bold text-slate-950">0</span><span className="mb-1 text-sm font-medium text-slate-500">of 250 questions</span></div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-0 rounded-full bg-green-600" /></div>
          <div className="mt-7 rounded-xl bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">Your progress starts here</p>
            <p className="mt-1 text-xs leading-5 text-green-800">Performance analytics will become active in a future phase.</p>
          </div>
        </Card>
      </div>

      <Card className="mt-6 border-dashed p-6 text-center">
        <h2 className="font-bold text-slate-900">Recent activity</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">There is no activity to show yet. Completed practice sessions and mock tests will appear here in later phases.</p>
      </Card>
    </Container>
  );
}

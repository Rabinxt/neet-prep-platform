import Link from "next/link";
import { SubjectCard } from "@/components/subjects/subject-card";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, ChartIcon, CheckIcon, ClockIcon, SparkIcon, TargetIcon } from "@/components/ui/icons";
import { listPublicSubjects } from "@/server/subjects/queries";

export const revalidate = 3600;

const benefits = [
  {
    icon: TargetIcon,
    title: "Practise with purpose",
    description: "Choose a subject, chapter, or topic and focus on exactly what needs work.",
  },
  {
    icon: ClockIcon,
    title: "Build exam confidence",
    description: "Develop speed and accuracy with timed practice designed around the NEET experience.",
  },
  {
    icon: ChartIcon,
    title: "See real progress",
    description: "Turn every practice session into clear signals about strengths and weak areas.",
  },
];

export default async function HomePage() {
  const { subjects } = await listPublicSubjects();

  return (
    <>
      <section className="overflow-hidden border-b border-slate-200 bg-white">
        <Container className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-800">
              <SparkIcon className="size-4" /> Focused preparation, one topic at a time
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[1.08]">
              Prepare for NEET with clarity and confidence.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Build stronger concepts, practise high-quality questions, and understand where to focus next across Physics, Chemistry, and Biology.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/subjects" size="lg">
                Explore subjects <ArrowRightIcon className="size-4" />
              </ButtonLink>
              <ButtonLink href="/mock-tests" variant="secondary" size="lg">View mock tests</ButtonLink>
            </div>
            <ul className="mt-8 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:gap-6">
              {["NCERT-aligned practice", "Detailed solutions", "Progress insights"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-green-100 text-green-700"><CheckIcon className="size-3.5" /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Card className="relative overflow-hidden border-green-100 bg-slate-950 p-5 text-white shadow-xl sm:p-7">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-green-500/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Today&apos;s study plan</p>
                  <p className="mt-1 text-xl font-bold">Keep your momentum</p>
                </div>
                <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-green-300">Sample</span>
              </div>
              <div className="mt-7 space-y-3">
                {[
                  ["Physics", "Laws of Motion", "12 questions", "bg-blue-400"],
                  ["Chemistry", "Chemical Bonding", "15 questions", "bg-violet-400"],
                  ["Biology", "Human Physiology", "20 questions", "bg-green-400"],
                ].map(([subject, topic, count, color], index) => (
                  <div key={subject} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${color} text-sm font-bold text-slate-950`}>{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-400">{subject}</p>
                      <p className="truncate font-semibold">{topic}</p>
                    </div>
                    <span className="text-xs text-slate-400">{count}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-green-500/15 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-green-100">Daily goal</span>
                  <span className="font-bold text-green-300">32 / 50 questions</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[64%] rounded-full bg-green-400" />
                </div>
              </div>
            </div>
          </Card>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wider text-green-700">Choose your subject</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Build confidence across the NEET syllabus</h2>
            <p className="mt-4 leading-7 text-slate-600">Move from broad subject practice to focused chapters and topics as your preparation becomes more precise.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {subjects.map((subject) => <SubjectCard key={subject.slug} subject={subject} />)}
          </div>
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
        <Container>
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-green-700">A calmer way to prepare</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Everything should help you take the next step</h2>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="text-center md:text-left">
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-green-100 text-green-700 md:mx-0"><Icon /></span>
                <h3 className="mt-5 text-lg font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="rounded-3xl bg-green-700 px-6 py-12 text-center text-white sm:px-12">
            <h2 className="text-3xl font-bold tracking-tight">Start with the subject that needs you most.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-green-100">Explore the syllabus and see how focused practice can fit into your study routine.</p>
            <Link href="/subjects" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-green-800 transition-colors hover:bg-green-50">
              Browse all subjects <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

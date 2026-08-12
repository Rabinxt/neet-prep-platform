import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, BookIcon, CheckIcon } from "@/components/ui/icons";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";
import { cn } from "@/lib/utils";
import { getPublicSubject, listPublicSubjects } from "@/server/subjects/queries";

type SubjectPageProps = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateStaticParams() {
  const { subjects } = await listPublicSubjects();
  return subjects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: SubjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { subject } = await getPublicSubject(slug);
  if (!subject) return {};
  return {
    title: `${subject.name} Preparation`,
    description: subject.description,
  };
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { slug } = await params;
  const { subject, source } = await getPublicSubject(slug);
  if (!subject) notFound();
  const tone = getSubjectTheme(subject.slug);

  return (
    <>
      <section className={cn("relative overflow-hidden text-white", tone.dark)}>
        <SubjectIcon slug={subject.slug} className="float-slower absolute -bottom-24 right-[8%] size-96 rotate-[-8deg] text-white/[0.055]" />
        <Container className="reveal-up relative py-12 sm:py-20">
          <nav className="mb-9 flex items-center gap-2 text-sm text-white/55" aria-label="Breadcrumb">
            <Link href="/subjects" className="hover:text-white">Subjects</Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-white">{subject.name}</span>
          </nav>
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white"><SubjectIcon slug={subject.slug} /></div>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-white/55">Master the syllabus</p>
              <h1 className="mt-2 text-5xl font-bold tracking-[-0.05em] text-white sm:text-6xl">NEET {subject.name}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">{subject.description}</p>
            </div>
            <ButtonLink href="#chapters" size="lg" className="bg-white text-slate-950 shadow-none hover:bg-white/90">Explore chapters <ArrowRightIcon className="size-4" /></ButtonLink>
          </div>
          <div className="stagger-in mt-10 grid gap-4 sm:grid-cols-3">
            <div className="border-l border-white/20 pl-4"><p className="text-3xl font-bold">{subject.chapterCount}</p><p className="mt-1 text-sm text-white/55">Syllabus chapters</p></div>
            <div className="border-l border-white/20 pl-4"><p className="text-3xl font-bold">{subject.topicCount}</p><p className="mt-1 text-sm text-white/55">Structured topics</p></div>
            <div className="border-l border-white/20 pl-4"><p className="text-3xl font-bold">{subject.questionCount}</p><p className="mt-1 text-sm text-white/55">Published questions</p></div>
          </div>
        </Container>
      </section>

      <section id="chapters" className="py-12 sm:py-16">
        <Container>
          {source === "fallback" && (
            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              PostgreSQL is not connected yet. This subject is being shown from the seed catalogue.
            </div>
          )}
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <div>
              <p className={cn("text-xs font-bold uppercase tracking-[0.18em]", tone.accent)}>Syllabus map</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Chapters</h2>
              <p className="mt-2 text-slate-600">Chapters are loaded in their configured academic order.</p>
              {subject.chapters.length > 0 ? (
                <div className="stagger-in mt-6 space-y-3">
                  {subject.chapters.map((chapter, index) => (
                    <Link
                      key={chapter.id}
                      href={`/questions?subject=${subject.slug}&chapter=${chapter.id}`}
                      className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      <div className={cn("flex items-center gap-4 border-b border-slate-200 bg-transparent px-2 py-5 transition-all duration-300 group-hover:bg-white/80 group-hover:pl-4 group-hover:shadow-[0_8px_24px_rgba(15,23,42,0.05)]", tone.accent)}>
                        <span className="w-9 shrink-0 font-mono text-xs font-bold opacity-55">{String(index + 1).padStart(2, "0")}</span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-900">{chapter.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">{chapter.topicCount} {chapter.topicCount === 1 ? "topic" : "topics"} · {chapter.questionCount} published {chapter.questionCount === 1 ? "question" : "questions"}</p>
                        </div>
                        <ArrowRightIcon className="hidden size-5 transition-transform group-hover:translate-x-1 sm:block" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="mt-6 border-dashed p-8 text-center">
                  <BookIcon className="mx-auto size-7 text-slate-400" />
                  <h3 className="mt-4 font-bold text-slate-900">No chapters added yet</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Only the three core subjects are seeded in Phase 1A. Chapters and topics can be added after the database is connected.</p>
                </Card>
              )}
            </div>
            <aside>
              <Card className={cn("surface-lift overflow-hidden border-t-4 p-6 lg:sticky lg:top-28", tone.border)}>
                <h2 className="font-bold text-slate-950">Content structure</h2>
                <ul className="mt-5 space-y-4">
                  {["Subject overview", "Ordered chapters", "Ordered topics"].map((area) => (
                    <li key={area} className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="grid size-6 place-items-center rounded-full bg-green-100 text-green-700"><CheckIcon className="size-4" /></span>
                      {area}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 border-t border-slate-200 pt-5">
                  <div className="flex flex-col gap-2">
                    <ButtonLink href={`/questions?subject=${subject.slug}`} className="w-full">Browse questions</ButtonLink>
                    <ButtonLink href="/practice" variant="secondary" className="w-full">Build a practice set</ButtonLink>
                  </div>
                </div>
              </Card>
            </aside>
          </div>
        </Container>
      </section>
    </>
  );
}

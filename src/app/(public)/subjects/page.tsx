import type { Metadata } from "next";
import { SubjectCard } from "@/components/subjects/subject-card";
import { Container } from "@/components/ui/container";
import { listPublicSubjects } from "@/server/subjects/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "NEET Subjects",
  description: "Explore NEET Physics, Chemistry, and Biology practice by chapter and topic.",
};

export default async function SubjectsPage() {
  const { subjects, source } = await listPublicSubjects();

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <Container className="py-14 sm:py-18">
          <p className="text-sm font-bold uppercase tracking-wider text-green-700">NEET syllabus</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Choose a subject and start building mastery</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Study the complete NEET syllabus through structured chapters, focused topics, and purposeful question practice.</p>
        </Container>
      </section>
      <section className="py-12 sm:py-16">
        <Container>
          {source === "fallback" && (
            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              PostgreSQL is not connected yet. Showing the three core subjects from the seed catalogue.
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-3">
            {subjects.map((subject) => <SubjectCard key={subject.slug} subject={subject} />)}
          </div>
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="font-semibold text-slate-800">Chapter-level practice is coming next.</p>
            <p className="mt-1 text-sm text-slate-500">This Phase 0 preview shows the planned subject experience using sample content.</p>
          </div>
        </Container>
      </section>
    </>
  );
}

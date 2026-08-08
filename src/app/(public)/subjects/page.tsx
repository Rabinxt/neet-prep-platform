import type { Metadata } from "next";
import { SubjectCard } from "@/components/subjects/subject-card";
import { Container } from "@/components/ui/container";
import { PageHeading } from "@/components/ui/page-heading";
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
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="study-grid absolute inset-0" />
        <Container className="relative py-16 sm:py-20">
          <PageHeading
            eyebrow="NEET syllabus"
            title="Choose a subject and start building mastery"
            description="Move through a structured hierarchy of chapters, topics, and published questions across the three NEET subjects."
          />
        </Container>
      </section>
      <section className="py-12 sm:py-20">
        <Container>
          {source === "fallback" && (
            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              PostgreSQL is not connected yet. Showing the three core subjects from the seed catalogue.
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-3">
            {subjects.map((subject) => <SubjectCard key={subject.slug} subject={subject} />)}
          </div>
        </Container>
      </section>
    </>
  );
}

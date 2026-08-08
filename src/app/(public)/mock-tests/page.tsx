import type { Metadata } from "next";
import { MockTestSetup, type ExamPreset } from "@/components/exam/mock-test-setup";
import { Container } from "@/components/ui/container";
import { PageHeading } from "@/components/ui/page-heading";
import { listPublishedQuestions } from "@/server/questions/queries";
import { getAnonymousSessionId } from "@/server/attempts/ownership";
import { findActiveAttempt } from "@/server/attempts/service";

export const metadata: Metadata = {
  title: "Development Mock Tests",
  description: "Create a timed development exam from the published NEET question bank.",
};

export const revalidate = 300;

export default async function MockTestsPage() {
  const [questions, anonymousSessionId] = await Promise.all([
    listPublishedQuestions({ limit: null }),
    getAnonymousSessionId(),
  ]);
  const activeAttempt = await findActiveAttempt(anonymousSessionId, "MOCK_EXAM");
  const presetDefinitions: Array<Pick<ExamPreset, "id" | "name" | "description"> & { subjectSlug?: string }> = [
    { id: "mixed", name: "Full Mixed Development Test", description: "A balanced selection from every subject currently available." },
    { id: "physics", name: "Physics Development Test", description: "A focused timed test using published Physics samples.", subjectSlug: "physics" },
    { id: "chemistry", name: "Chemistry Development Test", description: "A focused timed test using published Chemistry samples.", subjectSlug: "chemistry" },
    { id: "biology", name: "Biology Development Test", description: "A focused timed test using published Biology samples.", subjectSlug: "biology" },
  ];

  const presets = presetDefinitions.flatMap((definition) => {
    const matching = definition.subjectSlug
      ? questions.filter((question) => question.subject.slug === definition.subjectSlug)
      : questions;
    if (matching.length === 0) return [];

    return [{
      id: definition.id,
      name: definition.name,
      description: definition.description,
      availableCount: matching.length,
      subjects: [...new Set(matching.map((question) => question.subject.name))],
      markingSchemes: [...new Set(matching.map((question) => `+${question.positiveMarks}/−${question.negativeMarks}`))],
    } satisfies ExamPreset];
  });

  return (
    <>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="study-grid absolute inset-0 opacity-70" />
        <div className="absolute -right-24 top-0 size-80 rounded-full bg-blue-500/10 blur-3xl" />
        <Container className="relative py-14 sm:py-20 [&_h1]:text-white [&_p:last-child]:text-slate-300 [&_p:first-child]:text-blue-400 [&_p:first-child_span]:bg-blue-400">
          <PageHeading
            eyebrow="Exam mode MVP"
            title="Practise making decisions under time pressure"
            description="Build a timed exam from the published development bank. Responses and results are saved anonymously and evaluated securely."
          />
        </Container>
      </section>
      <section className="py-10 sm:py-14">
        <Container><MockTestSetup presets={presets} activeAttempt={activeAttempt} /></Container>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AttemptResults } from "@/components/attempts/attempt-results";
import { ExamSession } from "@/components/exam/exam-session";
import { getCurrentAttemptOwner } from "@/server/attempts/ownership";
import { loadOwnedAttempt } from "@/server/attempts/service";

export const metadata: Metadata = {
  title: "Saved Development Exam",
  description: "Resume or review a persistent development mock exam.",
};

export default async function MockExamAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const owner = await getCurrentAttemptOwner({ createAnonymous: false });
  const attempt = await loadOwnedAttempt(owner, attemptId);
  if (!attempt || attempt.type !== "MOCK_EXAM") notFound();
  return attempt.status === "IN_PROGRESS"
    ? <ExamSession attempt={attempt} />
    : <AttemptResults attempt={attempt} />;
}

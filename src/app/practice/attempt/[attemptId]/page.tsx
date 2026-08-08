import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AttemptResults } from "@/components/attempts/attempt-results";
import { PracticeSession } from "@/components/practice/practice-session";
import { getAnonymousSessionId } from "@/server/attempts/ownership";
import { loadOwnedAttempt } from "@/server/attempts/service";

export const metadata: Metadata = {
  title: "Saved Practice Attempt",
  description: "Resume or review a saved NEET practice attempt.",
};

export default async function PracticeAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const attempt = await loadOwnedAttempt(await getAnonymousSessionId(), attemptId);
  if (!attempt || attempt.type !== "PRACTICE") notFound();
  return attempt.status === "IN_PROGRESS"
    ? <PracticeSession attempt={attempt} />
    : <AttemptResults attempt={attempt} />;
}

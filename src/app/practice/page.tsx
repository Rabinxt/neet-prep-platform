import type { Metadata } from "next";
import { PracticeSetup } from "@/components/practice/practice-setup";
import { getCurrentAttemptOwner } from "@/server/attempts/ownership";
import { findActiveAttempt } from "@/server/attempts/service";
import { listPracticeTaxonomy } from "@/server/questions/queries";

export const metadata: Metadata = {
  title: "Practice Mode",
  description: "Build a persistent untimed NEET practice set by subject, chapter, topic, and difficulty.",
};

export default async function PracticePage() {
  const [taxonomy, owner] = await Promise.all([
    listPracticeTaxonomy(),
    getCurrentAttemptOwner({ createAnonymous: false }),
  ]);
  const activeAttempt = await findActiveAttempt(owner, "PRACTICE");
  return <PracticeSetup taxonomy={taxonomy} activeAttempt={activeAttempt} />;
}

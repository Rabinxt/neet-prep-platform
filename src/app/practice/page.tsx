import type { Metadata } from "next";
import { PracticeSession } from "@/components/practice/practice-session";
import { PracticeSetup } from "@/components/practice/practice-setup";
import {
  listPracticeQuestions,
  listPracticeTaxonomy,
  parseDifficulty,
  type PracticeQuestionCount,
} from "@/server/questions/queries";

export const metadata: Metadata = {
  title: "Practice Mode",
  description: "Build an untimed NEET practice set by subject, chapter, topic, and difficulty.",
};

type PracticePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseCount(value: string | undefined): PracticeQuestionCount {
  if (value === "all") return "all";
  const count = Number(value);
  return count === 10 || count === 20 ? count : 5;
}

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const params = await searchParams;
  const taxonomy = await listPracticeTaxonomy();

  if (firstValue(params.start) !== "1") {
    return <PracticeSetup taxonomy={taxonomy} />;
  }

  const subjectId = firstValue(params.subjectId);
  const chapterId = firstValue(params.chapterId);
  const topicId = firstValue(params.topicId);
  const difficultyValue = firstValue(params.difficulty);
  const difficulty = parseDifficulty(difficultyValue);
  const count = parseCount(firstValue(params.count));

  const subject = taxonomy.find((item) => item.id === subjectId);
  const chapter = chapterId
    ? subject?.chapters.find((item) => item.id === chapterId)
    : undefined;
  const topic = topicId
    ? chapter?.topics.find((item) => item.id === topicId)
    : undefined;

  const hasInvalidFilter = !subject
    || Boolean(chapterId && !chapter)
    || Boolean(topicId && !topic)
    || Boolean(difficultyValue && !difficulty);

  const questions = hasInvalidFilter
    ? []
    : await listPracticeQuestions(
        {
          subjectId: subject.id,
          chapterId: chapter?.id,
          topicId: topic?.id,
          difficulty,
        },
        count,
      );

  const label = [subject?.name, chapter?.name, topic?.name, difficulty?.toLowerCase()]
    .filter(Boolean)
    .join(" · ");

  return <PracticeSession questions={questions} practiceLabel={label || "Custom practice"} />;
}

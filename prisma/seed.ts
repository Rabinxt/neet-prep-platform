import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getDatabaseUrl } from "../src/server/db/env";
import { coreSubjects } from "../src/server/subjects/catalog";
import { developmentQuestionBank } from "./sample-questions";

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const subject of coreSubjects) {
    await prisma.subject.upsert({
      where: { slug: subject.slug },
      update: {
        name: subject.name,
        description: subject.description,
        order: subject.order,
      },
      create: subject,
    });
  }

  let questionCount = 0;

  for (const content of developmentQuestionBank) {
    const subject = await prisma.subject.findUniqueOrThrow({
      where: { slug: content.subjectSlug },
    });

    const chapter = await prisma.chapter.upsert({
      where: {
        subjectId_slug: { subjectId: subject.id, slug: content.chapter.slug },
      },
      update: {
        name: content.chapter.name,
        description: content.chapter.description,
        order: content.chapter.order,
      },
      create: { ...content.chapter, subjectId: subject.id },
    });

    const topic = await prisma.topic.upsert({
      where: {
        chapterId_slug: { chapterId: chapter.id, slug: content.topic.slug },
      },
      update: {
        name: content.topic.name,
        description: content.topic.description,
        order: content.topic.order,
      },
      create: { ...content.topic, chapterId: chapter.id },
    });

    for (const question of content.questions) {
      const correctOptionCount = question.options.filter((option) => option.isCorrect).length;
      if (question.options.length !== 4 || correctOptionCount !== 1) {
        throw new Error(`Development question ${question.id} must have four options and one correct answer.`);
      }

      const { options, useTopic, ...questionData } = question;
      const optionData = options.map((option, index) => ({
        optionLabel: option.label,
        optionText: option.text,
        order: index + 1,
        isCorrect: option.isCorrect,
      }));

      await prisma.question.upsert({
        where: { id: question.id },
        update: {
          ...questionData,
          subjectId: subject.id,
          chapterId: chapter.id,
          topicId: useTopic ? topic.id : null,
          sourceType: "SAMPLE",
          examYear: null,
          positiveMarks: 4,
          negativeMarks: 1,
          isPublished: true,
          options: {
            deleteMany: {},
            create: optionData,
          },
        },
        create: {
          ...questionData,
          subjectId: subject.id,
          chapterId: chapter.id,
          topicId: useTopic ? topic.id : null,
          sourceType: "SAMPLE",
          examYear: null,
          positiveMarks: 4,
          negativeMarks: 1,
          isPublished: true,
          options: { create: optionData },
        },
      });

      questionCount += 1;
    }
  }

  console.info(
    `Seeded ${coreSubjects.length} core subjects and ${questionCount} development SAMPLE questions.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

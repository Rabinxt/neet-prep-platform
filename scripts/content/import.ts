import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { getDatabaseUrl } from "../../src/server/db/env";
import { loadAndValidateContent } from "./load-content";

const { bundle, errors } = loadAndValidateContent();

if (errors.length > 0) {
  console.error(`Content import stopped because validation found ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error.file} [${error.identifier}]: ${error.reason}`);
  }
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

const legacyChapters = [
  { subjectSlug: "physics", chapterSlug: "dev-sample-mechanics" },
  { subjectSlug: "chemistry", chapterSlug: "dev-sample-chemistry-foundations" },
  { subjectSlug: "biology", chapterSlug: "dev-sample-cell-biology" },
];

try {
  await prisma.$transaction(async (tx) => {
    // Free the original development fixtures' display-order slots before the
    // proper taxonomy is upserted. These exact legacy chapters are removed only
    // after their known questions have been moved successfully.
    for (const [index, legacy] of legacyChapters.entries()) {
      const subject = await tx.subject.findUnique({ where: { slug: legacy.subjectSlug } });
      if (subject) {
        await tx.chapter.updateMany({
          where: { subjectId: subject.id, slug: legacy.chapterSlug },
          data: { order: 10_000 + index },
        });
      }
    }

    const subjectIds = new Map<string, string>();
    for (const subject of bundle.subjects) {
      const saved = await tx.subject.upsert({
        where: { slug: subject.id },
        update: {
          name: subject.name,
          description: subject.description,
          order: subject.order,
        },
        create: {
          slug: subject.id,
          name: subject.name,
          description: subject.description,
          order: subject.order,
        },
      });
      subjectIds.set(subject.id, saved.id);
    }

    const chapterIds = new Map<string, string>();
    for (const chapter of bundle.chapters) {
      const subjectId = subjectIds.get(chapter.subjectId);
      if (!subjectId) throw new Error(`Validated subject ${chapter.subjectId} is unavailable.`);
      const saved = await tx.chapter.upsert({
        where: { subjectId_slug: { subjectId, slug: chapter.slug } },
        update: {
          name: chapter.name,
          description: chapter.description,
          order: chapter.order,
        },
        create: {
          subjectId,
          slug: chapter.slug,
          name: chapter.name,
          description: chapter.description,
          order: chapter.order,
        },
      });
      chapterIds.set(chapter.id, saved.id);
    }

    const topicIds = new Map<string, string>();
    for (const topic of bundle.topics) {
      const chapterId = chapterIds.get(topic.chapterId);
      if (!chapterId) throw new Error(`Validated chapter ${topic.chapterId} is unavailable.`);
      const saved = await tx.topic.upsert({
        where: { chapterId_slug: { chapterId, slug: topic.slug } },
        update: {
          name: topic.name,
          description: topic.description,
          order: topic.order,
        },
        create: {
          chapterId,
          slug: topic.slug,
          name: topic.name,
          description: topic.description,
          order: topic.order,
        },
      });
      topicIds.set(topic.id, saved.id);
    }

    for (const question of bundle.questions) {
      const subjectId = subjectIds.get(question.subjectId);
      const chapterId = chapterIds.get(question.chapterId);
      const topicId = question.topicId ? topicIds.get(question.topicId) : null;
      if (!subjectId || !chapterId || (question.topicId && !topicId)) {
        throw new Error(`Validated hierarchy for ${question.id} is unavailable.`);
      }

      const existingByImportId = await tx.question.findUnique({
        where: { importId: question.id },
        select: { id: true },
      });
      const existingLegacy = !existingByImportId && question.legacyId
        ? await tx.question.findUnique({
            where: { id: question.legacyId },
            select: { id: true },
          })
        : null;
      const existingId = existingByImportId?.id ?? existingLegacy?.id;
      const optionData = question.options.map((option, index) => ({
        optionLabel: option.label,
        optionText: option.text,
        order: index + 1,
        isCorrect: option.isCorrect,
      }));
      const questionData = {
        importId: question.id,
        subjectId,
        chapterId,
        topicId,
        questionText: question.questionText,
        explanation: question.explanation,
        difficulty: question.difficulty,
        sourceType: question.sourceType,
        examYear: question.examYear,
        positiveMarks: question.positiveMarks,
        negativeMarks: question.negativeMarks,
        order: question.order,
        isPublished: question.isPublished,
      };

      if (existingId) {
        await tx.question.update({
          where: { id: existingId },
          data: {
            ...questionData,
            options: { deleteMany: {}, create: optionData },
          },
        });
      } else {
        await tx.question.create({
          data: {
            ...questionData,
            options: { create: optionData },
          },
        });
      }
    }

    for (const legacy of legacyChapters) {
      await tx.chapter.deleteMany({
        where: {
          slug: legacy.chapterSlug,
          subject: { slug: legacy.subjectSlug },
          questions: { none: {} },
        },
      });
    }
  }, { timeout: 120_000 });

  console.info(
    `Imported ${bundle.subjects.length} subjects, ${bundle.chapters.length} chapters, ${bundle.topics.length} topics, and ${bundle.questions.length} questions.`,
  );
} catch {
  console.error("Content import failed. No connection details were printed.");
  console.error("The transaction was rolled back. Check database connectivity, applied migrations, and content constraints.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

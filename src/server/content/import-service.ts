import type { PrismaClient } from "@/generated/prisma/client";
import type { ContentBundle } from "@/server/content/types";

const legacyChapters = [
  { subjectSlug: "physics", chapterSlug: "dev-sample-mechanics" },
  { subjectSlug: "chemistry", chapterSlug: "dev-sample-chemistry-foundations" },
  { subjectSlug: "biology", chapterSlug: "dev-sample-cell-biology" },
];

export type ContentImportResult = {
  subjectsCreated: number;
  chaptersCreated: number;
  topicsCreated: number;
  questionsCreated: number;
  questionsUpdated: number;
};

export async function importContentBundle(
  prisma: PrismaClient,
  bundle: ContentBundle,
  options: { cleanupLegacyFixtures?: boolean } = {},
): Promise<ContentImportResult> {
  return prisma.$transaction(async (tx) => {
    const result: ContentImportResult = {
      subjectsCreated: 0,
      chaptersCreated: 0,
      topicsCreated: 0,
      questionsCreated: 0,
      questionsUpdated: 0,
    };

    if (options.cleanupLegacyFixtures) {
      for (const [index, legacy] of legacyChapters.entries()) {
        const subject = await tx.subject.findUnique({ where: { slug: legacy.subjectSlug } });
        if (subject) {
          await tx.chapter.updateMany({
            where: { subjectId: subject.id, slug: legacy.chapterSlug },
            data: { order: 10_000 + index },
          });
        }
      }
    }

    const subjectIds = new Map<string, string>();
    for (const subject of bundle.subjects) {
      const existing = await tx.subject.findUnique({ where: { slug: subject.id }, select: { id: true } });
      const saved = await tx.subject.upsert({
        where: { slug: subject.id },
        update: { name: subject.name, description: subject.description, order: subject.order },
        create: { slug: subject.id, name: subject.name, description: subject.description, order: subject.order },
      });
      if (!existing) result.subjectsCreated += 1;
      subjectIds.set(subject.id, saved.id);
    }

    const chapterIds = new Map<string, string>();
    for (const chapter of bundle.chapters) {
      const subjectId = subjectIds.get(chapter.subjectId);
      if (!subjectId) throw new Error(`Validated subject ${chapter.subjectId} is unavailable.`);
      const existing = await tx.chapter.findUnique({
        where: { subjectId_slug: { subjectId, slug: chapter.slug } },
        select: { id: true },
      });
      const saved = await tx.chapter.upsert({
        where: { subjectId_slug: { subjectId, slug: chapter.slug } },
        update: { name: chapter.name, description: chapter.description, order: chapter.order },
        create: { subjectId, slug: chapter.slug, name: chapter.name, description: chapter.description, order: chapter.order },
      });
      if (!existing) result.chaptersCreated += 1;
      chapterIds.set(chapter.id, saved.id);
    }

    const topicIds = new Map<string, string>();
    for (const topic of bundle.topics) {
      const chapterId = chapterIds.get(topic.chapterId);
      if (!chapterId) throw new Error(`Validated chapter ${topic.chapterId} is unavailable.`);
      const existing = await tx.topic.findUnique({
        where: { chapterId_slug: { chapterId, slug: topic.slug } },
        select: { id: true },
      });
      const saved = await tx.topic.upsert({
        where: { chapterId_slug: { chapterId, slug: topic.slug } },
        update: { name: topic.name, description: topic.description, order: topic.order },
        create: { chapterId, slug: topic.slug, name: topic.name, description: topic.description, order: topic.order },
      });
      if (!existing) result.topicsCreated += 1;
      topicIds.set(topic.id, saved.id);
    }

    for (const question of bundle.questions) {
      const subjectId = subjectIds.get(question.subjectId);
      const chapterId = chapterIds.get(question.chapterId);
      const topicId = question.topicId ? topicIds.get(question.topicId) : null;
      if (!subjectId || !chapterId || (question.topicId && !topicId)) {
        throw new Error(`Validated hierarchy for ${question.id} is unavailable.`);
      }
      const existingByImportId = await tx.question.findUnique({ where: { importId: question.id }, select: { id: true } });
      const existingLegacy = !existingByImportId && question.legacyId
        ? await tx.question.findUnique({ where: { id: question.legacyId }, select: { id: true } })
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
          data: { ...questionData, options: { deleteMany: {}, create: optionData } },
        });
        result.questionsUpdated += 1;
      } else {
        await tx.question.create({ data: { ...questionData, options: { create: optionData } } });
        result.questionsCreated += 1;
      }
    }

    if (options.cleanupLegacyFixtures) {
      for (const legacy of legacyChapters) {
        await tx.chapter.deleteMany({
          where: { slug: legacy.chapterSlug, subject: { slug: legacy.subjectSlug }, questions: { none: {} } },
        });
      }
    }
    return result;
  }, { timeout: 120_000 });
}

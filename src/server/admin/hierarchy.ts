import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/client";
import { AdminValidationError, validateHierarchyInput } from "@/server/admin/validation";

export async function listAdminHierarchy() {
  return getPrisma().subject.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      order: true,
      _count: { select: { chapters: true, questions: true } },
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          subjectId: true,
          name: true,
          slug: true,
          description: true,
          order: true,
          _count: { select: { topics: true, questions: true } },
          topics: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              chapterId: true,
              name: true,
              slug: true,
              description: true,
              order: true,
              _count: { select: { questions: true } },
            },
          },
        },
      },
    },
  });
}

async function ensureSubject(tx: Prisma.TransactionClient, id: string) {
  const subject = await tx.subject.findUnique({ where: { id }, select: { id: true } });
  if (!subject) throw new AdminValidationError("Selected subject was not found.", { parentId: "Choose an existing subject." });
}

async function ensureChapter(tx: Prisma.TransactionClient, id: string) {
  const chapter = await tx.chapter.findUnique({ where: { id }, select: { id: true } });
  if (!chapter) throw new AdminValidationError("Selected chapter was not found.", { parentId: "Choose an existing chapter." });
}

export async function createAdminSubject(rawInput: unknown) {
  const input = validateHierarchyInput(rawInput, "subject");
  return getPrisma().subject.create({
    data: { name: input.name, slug: input.slug, description: input.description, order: input.order },
    select: { id: true },
  });
}

export async function updateAdminSubject(id: string, rawInput: unknown) {
  const input = validateHierarchyInput(rawInput, "subject");
  return getPrisma().subject.update({
    where: { id },
    data: { name: input.name, slug: input.slug, description: input.description, order: input.order },
    select: { id: true },
  });
}

export async function deleteAdminSubject(id: string) {
  return getPrisma().$transaction(async (tx) => {
    const subject = await tx.subject.findUnique({
      where: { id },
      select: { _count: { select: { chapters: true, questions: true } } },
    });
    if (!subject) throw new AdminValidationError("Subject was not found.");
    if (subject._count.chapters > 0 || subject._count.questions > 0) {
      throw new AdminValidationError("This subject still contains chapters or questions. Move or remove them first.");
    }
    return tx.subject.delete({ where: { id }, select: { id: true } });
  });
}

export async function createAdminChapter(rawInput: unknown) {
  const input = validateHierarchyInput(rawInput, "chapter");
  return getPrisma().$transaction(async (tx) => {
    await ensureSubject(tx, input.parentId!);
    return tx.chapter.create({
      data: {
        subjectId: input.parentId!,
        name: input.name,
        slug: input.slug,
        description: input.description,
        order: input.order,
      },
      select: { id: true },
    });
  });
}

export async function updateAdminChapter(id: string, rawInput: unknown) {
  const input = validateHierarchyInput(rawInput, "chapter");
  return getPrisma().$transaction(async (tx) => {
    await ensureSubject(tx, input.parentId!);
    const current = await tx.chapter.findUnique({
      where: { id },
      select: { subjectId: true, _count: { select: { questions: true } } },
    });
    if (!current) throw new AdminValidationError("Chapter was not found.");
    if (current.subjectId !== input.parentId && current._count.questions > 0) {
      throw new AdminValidationError("A chapter with questions cannot move subjects. Reassign its questions first.");
    }
    return tx.chapter.update({
      where: { id },
      data: {
        subjectId: input.parentId!,
        name: input.name,
        slug: input.slug,
        description: input.description,
        order: input.order,
      },
      select: { id: true },
    });
  });
}

export async function deleteAdminChapter(id: string) {
  return getPrisma().$transaction(async (tx) => {
    const chapter = await tx.chapter.findUnique({
      where: { id },
      select: { _count: { select: { topics: true, questions: true } } },
    });
    if (!chapter) throw new AdminValidationError("Chapter was not found.");
    if (chapter._count.topics > 0 || chapter._count.questions > 0) {
      throw new AdminValidationError("This chapter still contains topics or questions. Move or remove them first.");
    }
    return tx.chapter.delete({ where: { id }, select: { id: true } });
  });
}

export async function createAdminTopic(rawInput: unknown) {
  const input = validateHierarchyInput(rawInput, "topic");
  return getPrisma().$transaction(async (tx) => {
    await ensureChapter(tx, input.parentId!);
    return tx.topic.create({
      data: {
        chapterId: input.parentId!,
        name: input.name,
        slug: input.slug,
        description: input.description,
        order: input.order,
      },
      select: { id: true },
    });
  });
}

export async function updateAdminTopic(id: string, rawInput: unknown) {
  const input = validateHierarchyInput(rawInput, "topic");
  return getPrisma().$transaction(async (tx) => {
    await ensureChapter(tx, input.parentId!);
    const current = await tx.topic.findUnique({
      where: { id },
      select: { chapterId: true, _count: { select: { questions: true } } },
    });
    if (!current) throw new AdminValidationError("Topic was not found.");
    if (current.chapterId !== input.parentId && current._count.questions > 0) {
      throw new AdminValidationError("A topic with questions cannot move chapters. Reassign its questions first.");
    }
    return tx.topic.update({
      where: { id },
      data: {
        chapterId: input.parentId!,
        name: input.name,
        slug: input.slug,
        description: input.description,
        order: input.order,
      },
      select: { id: true },
    });
  });
}

export async function deleteAdminTopic(id: string) {
  return getPrisma().$transaction(async (tx) => {
    const topic = await tx.topic.findUnique({
      where: { id },
      select: { _count: { select: { questions: true } } },
    });
    if (!topic) throw new AdminValidationError("Topic was not found.");
    if (topic._count.questions > 0) {
      throw new AdminValidationError("This topic is used by live questions. Reassign or clear those questions first.");
    }
    return tx.topic.delete({ where: { id }, select: { id: true } });
  });
}

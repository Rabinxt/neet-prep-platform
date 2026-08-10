import { getPrisma } from "@/server/db/client";
import { importContentBundle } from "@/server/content/import-service";
import type {
  ContentBundle,
  ContentChapter,
  ContentQuestion,
  ContentSubject,
  ContentTopic,
} from "@/server/content/types";
import { AdminValidationError, validateQuestionInput } from "@/server/admin/validation";

const MAX_JSON_BYTES = 500_000;
const MAX_QUESTIONS = 200;
const identifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type AdminImportPreview = {
  counts: {
    subjects: number;
    chapters: number;
    topics: number;
    questions: number;
    questionsToCreate: number;
    questionsToUpdate: number;
    hierarchyAdditions: number;
  };
  warnings: string[];
};

type ParseResult = { bundle: ContentBundle | null; errors: string[] };

type ExistingHierarchySubject = {
  slug: string;
  order: number;
  chapters: Array<{
    slug: string;
    order: number;
    topics: Array<{ slug: string; order: number }>;
  }>;
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringField(record: Record<string, unknown>, key: string, max: number, label: string, errors: string[]) {
  const value = typeof record[key] === "string" ? record[key].trim() : "";
  if (!value) errors.push(`${label}: ${key} is required.`);
  else if (value.length > max) errors.push(`${label}: ${key} exceeds ${max} characters.`);
  return value;
}

function orderField(record: Record<string, unknown>, label: string, errors: string[]) {
  const value = record.order;
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 10_000) {
    errors.push(`${label}: order must be an integer from 0 to 10,000.`);
    return 0;
  }
  return Number(value);
}

function arrayField(root: Record<string, unknown>, key: string, max: number, errors: string[]) {
  const value = root[key];
  if (!Array.isArray(value)) {
    errors.push(`${key} must be an array.`);
    return [];
  }
  if (value.length > max) errors.push(`${key} exceeds the limit of ${max} items.`);
  return value.slice(0, max);
}

function duplicateErrors(items: Array<{ id: string }>, type: string, errors: string[]) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) errors.push(`Duplicate ${type} id: ${item.id}.`);
    seen.add(item.id);
  }
}

function duplicateKeyErrors<T>(items: T[], keyFor: (item: T) => string, label: string, errors: string[]) {
  const seen = new Set<string>();
  for (const item of items) {
    const key = keyFor(item);
    if (seen.has(key)) errors.push(`Duplicate ${label}: ${key}.`);
    seen.add(key);
  }
}

export function parseAdminImportJson(raw: string): ParseResult {
  if (typeof raw !== "string" || !raw.trim()) return { bundle: null, errors: ["Paste a JSON content bundle first."] };
  if (Buffer.byteLength(raw, "utf8") > MAX_JSON_BYTES) {
    return { bundle: null, errors: [`JSON exceeds the ${Math.round(MAX_JSON_BYTES / 1_000)} KB limit.`] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { bundle: null, errors: ["JSON is malformed. Check commas, quotes, and brackets."] };
  }
  const root = object(parsed);
  if (!root) return { bundle: null, errors: ["The JSON root must be an object containing subjects, chapters, topics, and questions arrays."] };
  const errors: string[] = [];
  const subjects: ContentSubject[] = [];
  const chapters: ContentChapter[] = [];
  const topics: ContentTopic[] = [];
  const questions: ContentQuestion[] = [];

  for (const [index, value] of arrayField(root, "subjects", 50, errors).entries()) {
    const record = object(value);
    const label = `Subject ${index + 1}`;
    if (!record) { errors.push(`${label} must be an object.`); continue; }
    const id = stringField(record, "id", 120, label, errors);
    if (id && !identifierPattern.test(id)) errors.push(`${label}: id must use lowercase kebab-case.`);
    subjects.push({
      id,
      name: stringField(record, "name", 120, label, errors),
      description: stringField(record, "description", 500, label, errors),
      order: orderField(record, label, errors),
    });
  }
  for (const [index, value] of arrayField(root, "chapters", 500, errors).entries()) {
    const record = object(value);
    const label = `Chapter ${index + 1}`;
    if (!record) { errors.push(`${label} must be an object.`); continue; }
    const id = stringField(record, "id", 120, label, errors);
    const slug = stringField(record, "slug", 120, label, errors);
    if (id && !identifierPattern.test(id)) errors.push(`${label}: id must use lowercase kebab-case.`);
    if (slug && !identifierPattern.test(slug)) errors.push(`${label}: slug must use lowercase kebab-case.`);
    chapters.push({
      id,
      subjectId: stringField(record, "subjectId", 120, label, errors),
      slug,
      name: stringField(record, "name", 120, label, errors),
      description: stringField(record, "description", 500, label, errors),
      order: orderField(record, label, errors),
    });
  }
  for (const [index, value] of arrayField(root, "topics", 1_000, errors).entries()) {
    const record = object(value);
    const label = `Topic ${index + 1}`;
    if (!record) { errors.push(`${label} must be an object.`); continue; }
    const id = stringField(record, "id", 120, label, errors);
    const slug = stringField(record, "slug", 120, label, errors);
    if (id && !identifierPattern.test(id)) errors.push(`${label}: id must use lowercase kebab-case.`);
    if (slug && !identifierPattern.test(slug)) errors.push(`${label}: slug must use lowercase kebab-case.`);
    topics.push({
      id,
      chapterId: stringField(record, "chapterId", 120, label, errors),
      slug,
      name: stringField(record, "name", 120, label, errors),
      description: stringField(record, "description", 500, label, errors),
      order: orderField(record, label, errors),
    });
  }
  for (const [index, value] of arrayField(root, "questions", MAX_QUESTIONS, errors).entries()) {
    const record = object(value);
    const label = `Question ${index + 1}`;
    if (!record) { errors.push(`${label} must be an object.`); continue; }
    const id = stringField(record, "id", 120, label, errors);
    if (id && !identifierPattern.test(id)) errors.push(`${label}: id must use lowercase kebab-case.`);
    if (typeof record.isPublished !== "boolean") errors.push(`${label}: isPublished must be a boolean.`);
    const rawOptions = Array.isArray(record.options) ? record.options : [];
    const labels = rawOptions.map((item) => object(item)?.label);
    if (labels.join(",") !== "A,B,C,D") errors.push(`${label}: options must use labels A, B, C, D in order.`);
    try {
      const validated = validateQuestionInput({
        subjectId: record.subjectId,
        chapterId: record.chapterId,
        topicId: record.topicId,
        questionText: record.questionText,
        explanation: record.explanation,
        difficulty: record.difficulty,
        sourceType: record.sourceType,
        examYear: record.examYear,
        positiveMarks: record.positiveMarks,
        negativeMarks: record.negativeMarks,
        order: record.order,
        isPublished: record.isPublished,
        options: rawOptions.map((item) => {
          const option = object(item);
          return { text: option?.text, isCorrect: option?.isCorrect };
        }),
      });
      questions.push({
        id,
        legacyId: typeof record.legacyId === "string" ? record.legacyId.trim().slice(0, 100) : undefined,
        subjectId: validated.subjectId,
        chapterId: validated.chapterId,
        topicId: validated.topicId,
        questionText: validated.questionText,
        explanation: validated.explanation,
        difficulty: validated.difficulty,
        sourceType: validated.sourceType,
        examYear: validated.examYear,
        positiveMarks: validated.positiveMarks,
        negativeMarks: validated.negativeMarks,
        order: validated.order,
        isPublished: validated.isPublished,
        options: validated.options.map((option) => ({ label: option.label, text: option.text, isCorrect: option.isCorrect })),
      });
    } catch (error) {
      if (error instanceof AdminValidationError) {
        for (const message of Object.values(error.fieldErrors)) errors.push(`${label}: ${message}`);
      } else errors.push(`${label}: question data is invalid.`);
    }
  }

  duplicateErrors(subjects, "subject", errors);
  duplicateErrors(chapters, "chapter", errors);
  duplicateErrors(topics, "topic", errors);
  duplicateErrors(questions, "question", errors);
  duplicateKeyErrors(subjects, (item) => String(item.order), "subject order", errors);
  duplicateKeyErrors(chapters, (item) => `${item.subjectId}:${item.slug}`, "chapter slug within subject", errors);
  duplicateKeyErrors(chapters, (item) => `${item.subjectId}:${item.order}`, "chapter order within subject", errors);
  duplicateKeyErrors(topics, (item) => `${item.chapterId}:${item.slug}`, "topic slug within chapter", errors);
  duplicateKeyErrors(topics, (item) => `${item.chapterId}:${item.order}`, "topic order within chapter", errors);
  const subjectMap = new Map(subjects.map((item) => [item.id, item]));
  const chapterMap = new Map(chapters.map((item) => [item.id, item]));
  const topicMap = new Map(topics.map((item) => [item.id, item]));
  for (const chapter of chapters) {
    if (!subjectMap.has(chapter.subjectId)) errors.push(`Chapter ${chapter.id} references a subject missing from this bundle.`);
  }
  for (const topic of topics) {
    if (!chapterMap.has(topic.chapterId)) errors.push(`Topic ${topic.id} references a chapter missing from this bundle.`);
  }
  for (const question of questions) {
    const chapter = chapterMap.get(question.chapterId);
    const topic = question.topicId ? topicMap.get(question.topicId) : null;
    if (!subjectMap.has(question.subjectId)) errors.push(`Question ${question.id} references a subject missing from this bundle.`);
    if (!chapter || chapter.subjectId !== question.subjectId) errors.push(`Question ${question.id} has an invalid subject/chapter relationship.`);
    if (question.topicId && (!topic || topic.chapterId !== question.chapterId)) errors.push(`Question ${question.id} has an invalid chapter/topic relationship.`);
  }
  return errors.length > 0
    ? { bundle: null, errors: [...new Set(errors)].slice(0, 50) }
    : { bundle: { subjects, chapters, topics, questions }, errors: [] };
}

export function findHierarchyOrderConflicts(
  bundle: ContentBundle,
  existingSubjects: ExistingHierarchySubject[],
) {
  const errors: string[] = [];
  const existingSubjectBySlug = new Map(existingSubjects.map((subject) => [subject.slug, subject]));

  for (const subject of bundle.subjects) {
    const orderOwner = existingSubjects.find((existing) => existing.order === subject.order);
    if (orderOwner && orderOwner.slug !== subject.id) {
      errors.push(`Subject ${subject.id} uses order ${subject.order}, already assigned to subject ${orderOwner.slug}.`);
    }
  }

  const chapterById = new Map(bundle.chapters.map((chapter) => [chapter.id, chapter]));
  for (const chapter of bundle.chapters) {
    const existingSubject = existingSubjectBySlug.get(chapter.subjectId);
    const orderOwner = existingSubject?.chapters.find((existing) => existing.order === chapter.order);
    if (orderOwner && orderOwner.slug !== chapter.slug) {
      errors.push(`Chapter ${chapter.id} uses order ${chapter.order}, already assigned to chapter ${orderOwner.slug} within subject ${chapter.subjectId}.`);
    }
  }

  for (const topic of bundle.topics) {
    const chapter = chapterById.get(topic.chapterId);
    const existingChapter = chapter
      ? existingSubjectBySlug.get(chapter.subjectId)?.chapters.find((existing) => existing.slug === chapter.slug)
      : undefined;
    const orderOwner = existingChapter?.topics.find((existing) => existing.order === topic.order);
    if (orderOwner && orderOwner.slug !== topic.slug) {
      errors.push(`Topic ${topic.id} uses order ${topic.order}, already assigned to topic ${orderOwner.slug} within chapter ${topic.chapterId}.`);
    }
  }

  return errors;
}

async function loadExistingHierarchy(bundle: ContentBundle) {
  return getPrisma().subject.findMany({
    where: {
      OR: [
        { slug: { in: bundle.subjects.map((item) => item.id) } },
        { order: { in: bundle.subjects.map((item) => item.order) } },
      ],
    },
    select: {
      slug: true,
      order: true,
      chapters: {
        select: {
          slug: true,
          order: true,
          topics: { select: { slug: true, order: true } },
        },
      },
    },
  });
}

function assertNoHierarchyOrderConflicts(
  bundle: ContentBundle,
  existingSubjects: ExistingHierarchySubject[],
) {
  const errors = findHierarchyOrderConflicts(bundle, existingSubjects);
  if (errors.length > 0) {
    throw new AdminValidationError("Import conflicts with existing hierarchy orders.", {
      import: errors.join("\n"),
    });
  }
}

export async function previewAdminImport(raw: string): Promise<AdminImportPreview> {
  const parsed = parseAdminImportJson(raw);
  if (!parsed.bundle) throw new AdminValidationError("Import validation failed.", { import: parsed.errors.join("\n") });
  const [existingSubjects, existingQuestions] = await Promise.all([
    loadExistingHierarchy(parsed.bundle),
    getPrisma().question.findMany({
      where: { importId: { in: parsed.bundle.questions.map((item) => item.id) } },
      select: { importId: true },
    }),
  ]);
  assertNoHierarchyOrderConflicts(parsed.bundle, existingSubjects);
  const subjectSlugs = new Set(existingSubjects.map((item) => item.slug));
  const chapterKeys = new Set(existingSubjects.flatMap((subject) => subject.chapters.map((chapter) => `${subject.slug}:${chapter.slug}`)));
  const topicKeys = new Set(existingSubjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.topics.map((topic) => `${subject.slug}:${chapter.slug}:${topic.slug}`))));
  const chapterById = new Map(parsed.bundle.chapters.map((item) => [item.id, item]));
  const existingImportIds = new Set(existingQuestions.map((item) => item.importId));
  const hierarchyAdditions = parsed.bundle.subjects.filter((item) => !subjectSlugs.has(item.id)).length
    + parsed.bundle.chapters.filter((item) => !chapterKeys.has(`${item.subjectId}:${item.slug}`)).length
    + parsed.bundle.topics.filter((item) => {
      const chapter = chapterById.get(item.chapterId);
      return !chapter || !topicKeys.has(`${chapter.subjectId}:${chapter.slug}:${item.slug}`);
    }).length;
  const questionsToUpdate = parsed.bundle.questions.filter((item) => existingImportIds.has(item.id)).length;
  return {
    counts: {
      subjects: parsed.bundle.subjects.length,
      chapters: parsed.bundle.chapters.length,
      topics: parsed.bundle.topics.length,
      questions: parsed.bundle.questions.length,
      questionsToCreate: parsed.bundle.questions.length - questionsToUpdate,
      questionsToUpdate,
      hierarchyAdditions,
    },
    warnings: parsed.bundle.questions.some((item) => item.sourceType === "PYQ")
      ? ["This bundle contains PYQs. Apply it only after independently verifying every source and exam year."]
      : [],
  };
}

export async function applyAdminImport(raw: string) {
  const parsed = parseAdminImportJson(raw);
  if (!parsed.bundle) throw new AdminValidationError("Import validation failed.", { import: parsed.errors.join("\n") });
  assertNoHierarchyOrderConflicts(parsed.bundle, await loadExistingHierarchy(parsed.bundle));
  return importContentBundle(getPrisma(), parsed.bundle);
}

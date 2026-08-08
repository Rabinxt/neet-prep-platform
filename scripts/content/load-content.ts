import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type {
  ContentBundle,
  ContentChapter,
  ContentQuestion,
  ContentSubject,
  ContentTopic,
  ContentValidationError,
} from "./types";

const contentRoot = join(process.cwd(), "data", "neet");
const identifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const difficulties = new Set(["EASY", "MEDIUM", "HARD"]);
const sourceTypes = new Set(["ORIGINAL", "PYQ", "SAMPLE"]);
const optionLabels = new Set(["A", "B", "C", "D"]);

function displayPath(path: string) {
  return relative(process.cwd(), path).replaceAll("\\", "/");
}

function readJson(path: string, errors: ContentValidationError[]): unknown {
  const file = displayPath(path);
  if (!existsSync(path)) {
    errors.push({ file, identifier: "file", reason: "Required content file is missing." });
    return [];
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push({
      file,
      identifier: "file",
      reason: `Malformed JSON: ${error instanceof Error ? error.message : "unknown parse error"}`,
    });
    return [];
  }
}

function records(value: unknown, file: string, errors: ContentValidationError[]) {
  if (!Array.isArray(value)) {
    errors.push({ file, identifier: "file", reason: "The JSON root must be an array." });
    return [];
  }
  return value.filter((item, index): item is Record<string, unknown> => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push({ file, identifier: `item-${index + 1}`, reason: "Each array item must be an object." });
      return false;
    }
    return true;
  });
}

function requiredString(record: Record<string, unknown>, key: string, file: string, identifier: string, errors: ContentValidationError[]) {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    errors.push({ file, identifier, reason: `${key} must be a non-empty string.` });
    return "";
  }
  return value.trim();
}

function requiredOrder(record: Record<string, unknown>, file: string, identifier: string, errors: ContentValidationError[]) {
  const value = record.order;
  if (!Number.isInteger(value) || Number(value) < 0) {
    errors.push({ file, identifier, reason: "order must be a non-negative integer." });
    return 0;
  }
  return Number(value);
}

function validateIdentifier(value: string, field: string, file: string, identifier: string, errors: ContentValidationError[]) {
  if (value && !identifierPattern.test(value)) {
    errors.push({ file, identifier, reason: `${field} must use lowercase kebab-case.` });
  }
}

function reportDuplicates(items: Array<{ id: string }>, label: string, file: string, errors: ContentValidationError[]) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      errors.push({ file, identifier: item.id, reason: `Duplicate ${label} identifier.` });
    }
    seen.add(item.id);
  }
}

function reportDuplicateKeys<T>(
  items: T[],
  keyFor: (item: T) => string,
  identifierFor: (item: T) => string,
  label: string,
  file: string,
  errors: ContentValidationError[],
) {
  const seen = new Set<string>();
  for (const item of items) {
    const key = keyFor(item);
    if (seen.has(key)) {
      errors.push({ file, identifier: identifierFor(item), reason: `Duplicate ${label}.` });
    }
    seen.add(key);
  }
}

function parseSubjects(errors: ContentValidationError[]) {
  const path = join(contentRoot, "subjects.json");
  const file = displayPath(path);
  const subjects: ContentSubject[] = [];
  for (const [index, record] of records(readJson(path, errors), file, errors).entries()) {
    const fallbackId = `subject-${index + 1}`;
    const id = requiredString(record, "id", file, fallbackId, errors);
    const identifier = id || fallbackId;
    const before = errors.length;
    validateIdentifier(id, "id", file, identifier, errors);
    const name = requiredString(record, "name", file, identifier, errors);
    const description = requiredString(record, "description", file, identifier, errors);
    const order = requiredOrder(record, file, identifier, errors);
    if (errors.length === before) subjects.push({ id, name, description, order });
  }
  reportDuplicates(subjects, "subject", file, errors);
  reportDuplicateKeys(subjects, (subject) => String(subject.order), (subject) => subject.id, "subject order", file, errors);
  return subjects;
}

function parseChapters(errors: ContentValidationError[]) {
  const path = join(contentRoot, "chapters.json");
  const file = displayPath(path);
  const chapters: ContentChapter[] = [];
  for (const [index, record] of records(readJson(path, errors), file, errors).entries()) {
    const fallbackId = `chapter-${index + 1}`;
    const id = requiredString(record, "id", file, fallbackId, errors);
    const identifier = id || fallbackId;
    const before = errors.length;
    validateIdentifier(id, "id", file, identifier, errors);
    const subjectId = requiredString(record, "subjectId", file, identifier, errors);
    const slug = requiredString(record, "slug", file, identifier, errors);
    validateIdentifier(slug, "slug", file, identifier, errors);
    const name = requiredString(record, "name", file, identifier, errors);
    const description = requiredString(record, "description", file, identifier, errors);
    const order = requiredOrder(record, file, identifier, errors);
    if (errors.length === before) chapters.push({ id, subjectId, slug, name, description, order });
  }
  reportDuplicates(chapters, "chapter", file, errors);
  reportDuplicateKeys(chapters, (chapter) => `${chapter.subjectId}:${chapter.slug}`, (chapter) => chapter.id, "chapter slug within subject", file, errors);
  reportDuplicateKeys(chapters, (chapter) => `${chapter.subjectId}:${chapter.order}`, (chapter) => chapter.id, "chapter order within subject", file, errors);
  return chapters;
}

function parseTopics(errors: ContentValidationError[]) {
  const path = join(contentRoot, "topics.json");
  const file = displayPath(path);
  const topics: ContentTopic[] = [];
  for (const [index, record] of records(readJson(path, errors), file, errors).entries()) {
    const fallbackId = `topic-${index + 1}`;
    const id = requiredString(record, "id", file, fallbackId, errors);
    const identifier = id || fallbackId;
    const before = errors.length;
    validateIdentifier(id, "id", file, identifier, errors);
    const chapterId = requiredString(record, "chapterId", file, identifier, errors);
    const slug = requiredString(record, "slug", file, identifier, errors);
    validateIdentifier(slug, "slug", file, identifier, errors);
    const name = requiredString(record, "name", file, identifier, errors);
    const description = requiredString(record, "description", file, identifier, errors);
    const order = requiredOrder(record, file, identifier, errors);
    if (errors.length === before) topics.push({ id, chapterId, slug, name, description, order });
  }
  reportDuplicates(topics, "topic", file, errors);
  reportDuplicateKeys(topics, (topic) => `${topic.chapterId}:${topic.slug}`, (topic) => topic.id, "topic slug within chapter", file, errors);
  reportDuplicateKeys(topics, (topic) => `${topic.chapterId}:${topic.order}`, (topic) => topic.id, "topic order within chapter", file, errors);
  return topics;
}

function parseQuestionFiles(errors: ContentValidationError[]) {
  const directory = join(contentRoot, "questions");
  if (!existsSync(directory)) {
    errors.push({ file: displayPath(directory), identifier: "directory", reason: "Question directory is missing." });
    return [];
  }

  const questions: ContentQuestion[] = [];
  const files = readdirSync(directory).filter((file) => file.endsWith(".json")).sort();
  if (files.length === 0) {
    errors.push({ file: displayPath(directory), identifier: "directory", reason: "No question JSON files were found." });
  }

  for (const filename of files) {
    const path = join(directory, filename);
    const file = displayPath(path);
    for (const [index, record] of records(readJson(path, errors), file, errors).entries()) {
      const fallbackId = `question-${index + 1}`;
      const id = requiredString(record, "id", file, fallbackId, errors);
      const identifier = id || fallbackId;
      const before = errors.length;
      validateIdentifier(id, "id", file, identifier, errors);
      const legacyId = typeof record.legacyId === "string" ? record.legacyId.trim() : undefined;
      const subjectId = requiredString(record, "subjectId", file, identifier, errors);
      const chapterId = requiredString(record, "chapterId", file, identifier, errors);
      const topicId = record.topicId === null ? null : requiredString(record, "topicId", file, identifier, errors);
      const questionText = requiredString(record, "questionText", file, identifier, errors);
      const explanation = record.explanation === null ? null : requiredString(record, "explanation", file, identifier, errors);
      const difficulty = record.difficulty;
      if (typeof difficulty !== "string" || !difficulties.has(difficulty)) errors.push({ file, identifier, reason: "difficulty must be EASY, MEDIUM, or HARD." });
      const sourceType = record.sourceType;
      if (typeof sourceType !== "string" || !sourceTypes.has(sourceType)) errors.push({ file, identifier, reason: "sourceType must be ORIGINAL, PYQ, or SAMPLE." });
      const examYear = record.examYear;
      const currentYear = new Date().getFullYear();
      if (sourceType === "PYQ" && (!Number.isInteger(examYear) || Number(examYear) < 2013 || Number(examYear) > currentYear)) errors.push({ file, identifier, reason: `PYQ questions require an examYear between 2013 and ${currentYear}.` });
      if (sourceType !== "PYQ" && examYear !== null) errors.push({ file, identifier, reason: "Only PYQ questions may define examYear." });
      const positiveMarks = record.positiveMarks;
      const negativeMarks = record.negativeMarks;
      if (!Number.isInteger(positiveMarks) || Number(positiveMarks) <= 0) errors.push({ file, identifier, reason: "positiveMarks must be a positive integer." });
      if (!Number.isInteger(negativeMarks) || Number(negativeMarks) < 0) errors.push({ file, identifier, reason: "negativeMarks must be a non-negative integer." });
      const order = requiredOrder(record, file, identifier, errors);
      if (typeof record.isPublished !== "boolean") errors.push({ file, identifier, reason: "isPublished must be a boolean." });

      const rawOptions = record.options;
      if (!Array.isArray(rawOptions) || rawOptions.length !== 4) {
        errors.push({ file, identifier, reason: "A question must contain exactly four options." });
      }
      const options: ContentQuestion["options"] = [];
      if (Array.isArray(rawOptions)) {
        for (const [optionIndex, rawOption] of rawOptions.entries()) {
          if (!rawOption || typeof rawOption !== "object" || Array.isArray(rawOption)) {
            errors.push({ file, identifier, reason: `Option ${optionIndex + 1} must be an object.` });
            continue;
          }
          const option = rawOption as Record<string, unknown>;
          const label = option.label;
          const text = option.text;
          if (typeof label !== "string" || !optionLabels.has(label)) errors.push({ file, identifier, reason: `Option ${optionIndex + 1} must use label A, B, C, or D.` });
          if (typeof text !== "string" || !text.trim()) errors.push({ file, identifier, reason: `Option ${optionIndex + 1} requires text.` });
          if (typeof option.isCorrect !== "boolean") errors.push({ file, identifier, reason: `Option ${optionIndex + 1} requires boolean isCorrect.` });
          if (typeof label === "string" && optionLabels.has(label) && typeof text === "string" && text.trim() && typeof option.isCorrect === "boolean") {
            options.push({ label: label as "A" | "B" | "C" | "D", text: text.trim(), isCorrect: option.isCorrect });
          }
        }
      }
      if (new Set(options.map((option) => option.label)).size !== options.length) errors.push({ file, identifier, reason: "Option labels must be unique." });
      const correctCount = options.filter((option) => option.isCorrect).length;
      if (correctCount === 0) errors.push({ file, identifier, reason: "A question must have one correct option." });
      if (correctCount > 1) errors.push({ file, identifier, reason: "A question cannot have multiple correct options." });

      if (errors.length === before) {
        questions.push({
          id,
          legacyId,
          subjectId,
          chapterId,
          topicId,
          questionText,
          explanation,
          difficulty: difficulty as ContentQuestion["difficulty"],
          sourceType: sourceType as ContentQuestion["sourceType"],
          examYear: examYear as number | null,
          positiveMarks: Number(positiveMarks),
          negativeMarks: Number(negativeMarks),
          order,
          isPublished: record.isPublished as boolean,
          options,
        });
      }
    }
  }
  reportDuplicates(questions, "question", "data/neet/questions/*.json", errors);
  reportDuplicateKeys(
    questions.filter((question) => question.legacyId),
    (question) => question.legacyId ?? "",
    (question) => question.id,
    "legacy question identifier",
    "data/neet/questions/*.json",
    errors,
  );
  return questions;
}

export function loadAndValidateContent(): { bundle: ContentBundle; errors: ContentValidationError[] } {
  const errors: ContentValidationError[] = [];
  const subjects = parseSubjects(errors);
  const chapters = parseChapters(errors);
  const topics = parseTopics(errors);
  const questions = parseQuestionFiles(errors);

  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
  const chapterMap = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const topicMap = new Map(topics.map((topic) => [topic.id, topic]));

  for (const chapter of chapters) {
    if (!subjectMap.has(chapter.subjectId)) errors.push({ file: "data/neet/chapters.json", identifier: chapter.id, reason: `Missing subject ${chapter.subjectId}.` });
  }
  for (const topic of topics) {
    if (!chapterMap.has(topic.chapterId)) errors.push({ file: "data/neet/topics.json", identifier: topic.id, reason: `Missing chapter ${topic.chapterId}.` });
  }
  for (const question of questions) {
    const file = `data/neet/questions/${question.subjectId}.json`;
    const chapter = chapterMap.get(question.chapterId);
    const topic = question.topicId ? topicMap.get(question.topicId) : undefined;
    if (!subjectMap.has(question.subjectId)) errors.push({ file, identifier: question.id, reason: `Missing subject ${question.subjectId}.` });
    if (!chapter) errors.push({ file, identifier: question.id, reason: `Missing chapter ${question.chapterId}.` });
    if (chapter && chapter.subjectId !== question.subjectId) errors.push({ file, identifier: question.id, reason: "Question chapter does not belong to its subject." });
    if (question.topicId && !topic) errors.push({ file, identifier: question.id, reason: `Invalid topic ${question.topicId}.` });
    if (topic && topic.chapterId !== question.chapterId) errors.push({ file, identifier: question.id, reason: "Question topic does not belong to its chapter." });
  }

  return { bundle: { subjects, chapters, topics, questions }, errors };
}

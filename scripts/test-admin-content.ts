import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { getPrisma } from "../src/server/db/client";
import {
  bulkSetAdminQuestionPublication,
  createAdminQuestion,
  deleteAdminQuestion,
  listAdminQuestions,
  updateAdminQuestion,
} from "../src/server/admin/questions";
import {
  createAdminChapter,
  createAdminSubject,
  createAdminTopic,
  deleteAdminChapter,
  deleteAdminSubject,
  deleteAdminTopic,
} from "../src/server/admin/hierarchy";
import { applyAdminImport, parseAdminImportJson, previewAdminImport } from "../src/server/admin/import";
import { AdminValidationError } from "../src/server/admin/validation";
import { createPersistentAttempt, loadOwnedAttempt } from "../src/server/attempts/service";

const prisma = getPrisma();
const suffix = randomUUID();
const slugSuffix = suffix.toLowerCase();
const createdQuestionIds: string[] = [];
const attemptIds: string[] = [];
const anonymousSessionIds: string[] = [];
let subjectId: string | null = null;
let chapterId: string | null = null;
let topicId: string | null = null;
const importSubjectSlug = `phase8-import-${slugSuffix}`;

function input(overrides: Record<string, unknown> = {}) {
  return {
    subjectId,
    chapterId,
    topicId,
    questionText: `Phase 8 disposable question ${randomUUID()}`,
    explanation: "A disposable explanation used only by the Phase 8 integration suite.",
    difficulty: "MEDIUM",
    sourceType: "ORIGINAL",
    examYear: null,
    positiveMarks: 4,
    negativeMarks: 1,
    order: 0,
    isPublished: true,
    options: [
      { label: "A", text: "Correct fixture option", isCorrect: true },
      { label: "B", text: "Distractor B", isCorrect: false },
      { label: "C", text: "Distractor C", isCorrect: false },
      { label: "D", text: "Distractor D", isCorrect: false },
    ],
    ...overrides,
  };
}

async function rejectsValidation(task: () => Promise<unknown>, label: string) {
  await assert.rejects(task, (error) => error instanceof AdminValidationError, label);
}

try {
  const maximumSubjectOrder = await prisma.subject.aggregate({ _max: { order: true } });
  const subject = await createAdminSubject({
    name: "Phase 8 Disposable Subject",
    slug: `phase8-subject-${slugSuffix}`,
    description: "Integration test only.",
    order: (maximumSubjectOrder._max.order ?? 0) + 100,
  });
  subjectId = subject.id;
  const chapter = await createAdminChapter({
    parentId: subject.id,
    name: "Phase 8 Disposable Chapter",
    slug: `phase8-chapter-${slugSuffix}`,
    description: "Integration test only.",
    order: 1,
  });
  chapterId = chapter.id;
  const topic = await createAdminTopic({
    parentId: chapter.id,
    name: "Phase 8 Disposable Topic",
    slug: `phase8-topic-${slugSuffix}`,
    description: "Integration test only.",
    order: 1,
  });
  topicId = topic.id;
  assert(subjectId && chapterId && topicId, "Disposable hierarchy was not created.");

  const valid = await createAdminQuestion(input());
  createdQuestionIds.push(valid.id);
  const stored = await prisma.question.findUniqueOrThrow({ where: { id: valid.id }, include: { options: true } });
  assert.equal(stored.options.length, 4, "Valid create did not persist four options.");
  assert.equal(stored.options.filter((option) => option.isCorrect).length, 1, "Valid create did not persist one correct option.");

  await rejectsValidation(() => createAdminQuestion(input({ options: input().options.slice(0, 3) })), "Three options were accepted.");
  await rejectsValidation(() => createAdminQuestion(input({ options: input().options.map((option) => ({ ...option, isCorrect: false })) })), "Zero correct options were accepted.");
  await rejectsValidation(() => createAdminQuestion(input({ options: input().options.map((option, index) => ({ ...option, isCorrect: index < 2 })) })), "Multiple correct options were accepted.");
  await rejectsValidation(() => createAdminQuestion(input({ explanation: "" })), "A blank explanation was accepted.");
  await rejectsValidation(() => createAdminQuestion(input({ sourceType: "ORIGINAL", examYear: 2024 })), "An ORIGINAL exam year was accepted.");
  await rejectsValidation(() => createAdminQuestion(input({ sourceType: "PYQ", examYear: null })), "A PYQ without a year was accepted.");

  const unrelatedChapter = await prisma.chapter.findFirstOrThrow({ where: { subjectId: { not: subject.id } }, select: { id: true } });
  await rejectsValidation(() => createAdminQuestion(input({ chapterId: unrelatedChapter.id, topicId: null })), "Invalid subject/chapter relation was accepted.");
  const unrelatedTopic = await prisma.topic.findFirstOrThrow({ where: { chapterId: { not: chapter.id } }, select: { id: true } });
  await rejectsValidation(() => createAdminQuestion(input({ topicId: unrelatedTopic.id })), "Invalid chapter/topic relation was accepted.");

  for (let index = 1; index <= 11; index += 1) {
    const question = await createAdminQuestion(input({
      questionText: `Phase 8 pagination fixture ${String(index).padStart(2, "0")} ${suffix}`,
      difficulty: index % 2 ? "EASY" : "HARD",
      isPublished: index % 3 !== 0,
      order: index,
    }));
    createdQuestionIds.push(question.id);
  }
  const pageOne = await listAdminQuestions({ subjectId: subject.id, page: 1, pageSize: 10 });
  const pageTwo = await listAdminQuestions({ subjectId: subject.id, page: 2, pageSize: 10 });
  assert.equal(pageOne.questions.length, 10, "Admin pagination did not limit page one.");
  assert.equal(pageTwo.questions.length, 2, "Admin pagination did not return the remaining rows.");
  const filtered = await listAdminQuestions({ subjectId: subject.id, difficulty: "HARD", publication: "published", page: 1, pageSize: 20 });
  assert(filtered.questions.every((question) => question.difficulty === "HARD" && question.isPublished), "Admin filters returned a mismatched question.");
  const searched = await listAdminQuestions({ search: "pagination fixture 05", page: 1, pageSize: 10 });
  assert.equal(searched.total, 1, "Admin search did not isolate the expected question.");

  const token = randomBytes(32).toString("base64url");
  const anonymous = await prisma.anonymousSession.create({ data: { tokenHash: createHash("sha256").update(token).digest("hex") } });
  anonymousSessionIds.push(anonymous.id);
  const owner = { kind: "anonymous" as const, anonymousSessionId: anonymous.id };
  const practice = await createPersistentAttempt({ owner, type: "PRACTICE", name: "Phase 8 snapshot practice", questionIds: [valid.id], configuration: { phase8: true } });
  const mock = await createPersistentAttempt({ owner, type: "MOCK_EXAM", name: "Phase 8 snapshot mock", questionIds: [valid.id], configuration: { phase8: true }, durationSeconds: 600 });
  attemptIds.push(practice.id, mock.id);
  const snapshotBefore = await prisma.attemptQuestion.findFirstOrThrow({ where: { attemptId: practice.id }, include: { options: { orderBy: { order: "asc" } } } });
  await updateAdminQuestion(valid.id, input({
    questionText: "Phase 8 edited live wording",
    explanation: "Edited live explanation.",
    options: [
      { label: "A", text: "Edited A", isCorrect: false },
      { label: "B", text: "Edited correct B", isCorrect: true },
      { label: "C", text: "Edited C", isCorrect: false },
      { label: "D", text: "Edited D", isCorrect: false },
    ],
  }));
  const snapshotAfterEdit = await prisma.attemptQuestion.findFirstOrThrow({ where: { attemptId: practice.id }, include: { options: { orderBy: { order: "asc" } } } });
  assert.equal(snapshotAfterEdit.questionText, snapshotBefore.questionText, "Live edit rewrote snapshot question text.");
  assert.deepEqual(snapshotAfterEdit.options.map((option) => option.optionText), snapshotBefore.options.map((option) => option.optionText), "Live edit rewrote snapshot options.");

  await bulkSetAdminQuestionPublication([valid.id], false);
  assert.equal(await prisma.question.count({ where: { id: valid.id, isPublished: true } }), 0, "Bulk unpublish failed.");
  await assert.rejects(() => createPersistentAttempt({ owner, type: "PRACTICE", name: "Blocked unpublished practice", questionIds: [valid.id], configuration: {} }), "Unpublished question entered a new practice.");
  await assert.rejects(() => createPersistentAttempt({ owner, type: "MOCK_EXAM", name: "Blocked unpublished mock", questionIds: [valid.id], configuration: {}, durationSeconds: 60 }), "Unpublished question entered a new mock.");
  assert(await loadOwnedAttempt(owner, practice.id), "Historical practice failed after unpublish.");
  assert(await loadOwnedAttempt(owner, mock.id), "Historical mock failed after unpublish.");
  await bulkSetAdminQuestionPublication([valid.id, createdQuestionIds[1]], true);
  assert.equal(await prisma.question.count({ where: { id: { in: [valid.id, createdQuestionIds[1]] }, isPublished: true } }), 2, "Bulk publish failed.");

  await deleteAdminQuestion(valid.id);
  const snapshotAfterDelete = await prisma.attemptQuestion.findFirstOrThrow({ where: { attemptId: practice.id }, include: { options: true } });
  assert.equal(snapshotAfterDelete.sourceQuestionId, null, "Deleted live question remained linked from snapshot.");
  assert.equal(snapshotAfterDelete.questionText, snapshotBefore.questionText, "Live delete changed snapshot wording.");
  assert.equal(snapshotAfterDelete.options.length, 4, "Live option deletion removed snapshot options.");
  assert(await loadOwnedAttempt(owner, practice.id), "Historical practice failed after live delete.");
  createdQuestionIds.splice(createdQuestionIds.indexOf(valid.id), 1);

  await rejectsValidation(() => deleteAdminTopic(topic.id), "Question-linked topic deletion was not blocked.");
  await rejectsValidation(() => deleteAdminChapter(chapter.id), "Populated chapter deletion was not blocked.");
  await rejectsValidation(() => deleteAdminSubject(subject.id), "Populated subject deletion was not blocked.");

  const importOrder = (await prisma.subject.aggregate({ _max: { order: true } }))._max.order! + 100;
  const importQuestionId = `phase8-import-question-${slugSuffix}`;
  const bundle = {
    subjects: [{ id: importSubjectSlug, name: "Phase 8 Import Subject", description: "Disposable import.", order: importOrder }],
    chapters: [{ id: `${importSubjectSlug}-chapter`, subjectId: importSubjectSlug, slug: "import-chapter", name: "Import Chapter", description: "Disposable import.", order: 1 }],
    topics: [{ id: `${importSubjectSlug}-topic`, chapterId: `${importSubjectSlug}-chapter`, slug: "import-topic", name: "Import Topic", description: "Disposable import.", order: 1 }],
    questions: [{
      id: importQuestionId,
      subjectId: importSubjectSlug,
      chapterId: `${importSubjectSlug}-chapter`,
      topicId: `${importSubjectSlug}-topic`,
      questionText: "Phase 8 idempotent import fixture?",
      explanation: "Used only to verify atomic and idempotent admin imports.",
      difficulty: "EASY",
      sourceType: "SAMPLE",
      examYear: null,
      positiveMarks: 4,
      negativeMarks: 1,
      order: 1,
      isPublished: false,
      options: [
        { label: "A", text: "Correct", isCorrect: true },
        { label: "B", text: "B", isCorrect: false },
        { label: "C", text: "C", isCorrect: false },
        { label: "D", text: "D", isCorrect: false },
      ],
    }],
  };
  const rawBundle = JSON.stringify(bundle);
  const preview = await previewAdminImport(rawBundle);
  assert.equal(preview.counts.questionsToCreate, 1, "Import preview did not report a creation.");
  const firstImport = await applyAdminImport(rawBundle);
  assert.equal(firstImport.questionsCreated, 1, "Valid import did not create its question.");
  const secondImport = await applyAdminImport(rawBundle);
  assert.equal(secondImport.questionsCreated, 0, "Idempotent import created a duplicate.");
  assert.equal(secondImport.questionsUpdated, 1, "Idempotent import did not update the matching importId.");
  assert.equal(await prisma.question.count({ where: { importId: importQuestionId } }), 1, "ImportId was duplicated.");
  const beforeInvalid = await prisma.question.count();
  const invalid = parseAdminImportJson(JSON.stringify({ ...bundle, questions: [{ ...bundle.questions[0], id: `${importQuestionId}-invalid`, options: bundle.questions[0].options.slice(0, 3) }] }));
  assert.equal(invalid.bundle, null, "Invalid import passed validation.");
  assert.equal(await prisma.question.count(), beforeInvalid, "Invalid import changed the database.");

  console.info("Admin content-management integration checks passed (24 scenarios). Authorization wrappers are exercised in browser smoke tests.");
} finally {
  if (attemptIds.length) await prisma.attempt.deleteMany({ where: { id: { in: attemptIds } } });
  if (createdQuestionIds.length) await prisma.question.deleteMany({ where: { id: { in: createdQuestionIds } } });
  const importedSubject = await prisma.subject.findUnique({ where: { slug: importSubjectSlug }, select: { id: true } });
  if (importedSubject) await prisma.subject.delete({ where: { id: importedSubject.id } });
  if (topicId) await prisma.topic.deleteMany({ where: { id: topicId } });
  if (chapterId) await prisma.chapter.deleteMany({ where: { id: chapterId } });
  if (subjectId) await prisma.subject.deleteMany({ where: { id: subjectId } });
  if (anonymousSessionIds.length) await prisma.anonymousSession.deleteMany({ where: { id: { in: anonymousSessionIds } } });
  await prisma.$disconnect();
}

import assert from "node:assert/strict";
import test from "node:test";
import { findHierarchyOrderConflicts, parseAdminImportJson } from "@/server/admin/import";

const omitted = Symbol("omitted");

function questionBundle(
  sourceType: "ORIGINAL" | "SAMPLE" | "PYQ",
  examYear: number | null | typeof omitted = omitted,
) {
  const question: Record<string, unknown> = {
    id: `validation-${sourceType.toLowerCase()}-question`,
    subjectId: "validation-subject",
    chapterId: "validation-chapter",
    topicId: null,
    questionText: "Which option is correct in this importer validation fixture?",
    explanation: "Option A is marked correct solely for this validation fixture.",
    difficulty: "MEDIUM",
    sourceType,
    positiveMarks: 4,
    negativeMarks: 1,
    order: 1,
    isPublished: false,
    options: [
      { label: "A", text: "Correct option", isCorrect: true },
      { label: "B", text: "Distractor B", isCorrect: false },
      { label: "C", text: "Distractor C", isCorrect: false },
      { label: "D", text: "Distractor D", isCorrect: false },
    ],
  };
  if (examYear !== omitted) question.examYear = examYear;

  return JSON.stringify({
    subjects: [{
      id: "validation-subject",
      name: "Validation Subject",
      description: "Importer validation fixture.",
      order: 1,
    }],
    chapters: [{
      id: "validation-chapter",
      subjectId: "validation-subject",
      slug: "validation-chapter",
      name: "Validation Chapter",
      description: "Importer validation fixture.",
      order: 1,
    }],
    topics: [],
    questions: [question],
  });
}

function assertValid(sourceType: "ORIGINAL" | "SAMPLE" | "PYQ", examYear?: number | null) {
  const result = examYear === undefined
    ? parseAdminImportJson(questionBundle(sourceType))
    : parseAdminImportJson(questionBundle(sourceType, examYear));
  assert(result.bundle, `${sourceType} should be valid, but received: ${result.errors.join(" ")}`);
  return result.bundle.questions[0];
}

function assertInvalidYear(sourceType: "ORIGINAL" | "SAMPLE" | "PYQ", examYear?: number) {
  const result = examYear === undefined
    ? parseAdminImportJson(questionBundle(sourceType))
    : parseAdminImportJson(questionBundle(sourceType, examYear));
  assert.equal(result.bundle, null, `${sourceType} unexpectedly accepted its exam-year value.`);
  return result.errors;
}

test("ORIGINAL and SAMPLE imports accept an omitted or null exam year", () => {
  assert.equal(assertValid("ORIGINAL").examYear, null);
  assert.equal(assertValid("SAMPLE").examYear, null);
  assert.equal(assertValid("ORIGINAL", null).examYear, null);
  assert.equal(assertValid("SAMPLE", null).examYear, null);
});

test("ORIGINAL and SAMPLE imports reject an actual exam year", () => {
  assert(
    assertInvalidYear("ORIGINAL", 2024)
      .some((error) => error.includes("SAMPLE and ORIGINAL questions must not have an exam year.")),
  );
  assert(
    assertInvalidYear("SAMPLE", 2025)
      .some((error) => error.includes("SAMPLE and ORIGINAL questions must not have an exam year.")),
  );
});

test("PYQ imports still require a legitimate exam year", () => {
  assert.equal(assertValid("PYQ", 2024).examYear, 2024);
  assert(
    assertInvalidYear("PYQ")
      .some((error) => error.includes("Verified PYQs require an exam year")),
  );
});

function biologyFiveQuestionBundle(subjectOrder: number, chapterOrder: number) {
  return JSON.stringify({
    subjects: [{
      id: "biology",
      name: "Biology",
      description: "Biology for NEET.",
      order: subjectOrder,
    }],
    chapters: [{
      id: "biology-cell-unit-of-life",
      subjectId: "biology",
      slug: "cell-the-unit-of-life",
      name: "Cell: The Unit of Life",
      description: "Cell structure and organelles.",
      order: chapterOrder,
    }],
    topics: [
      {
        id: "biology-cell-structure",
        chapterId: "biology-cell-unit-of-life",
        slug: "cell-structure",
        name: "Cell Structure",
        description: "Fundamental cellular structure.",
        order: 1,
      },
      {
        id: "biology-cell-organelles",
        chapterId: "biology-cell-unit-of-life",
        slug: "cell-organelles",
        name: "Cell Organelles",
        description: "Structure and function of cell organelles.",
        order: 2,
      },
    ],
    questions: Array.from({ length: 5 }, (_, index) => ({
      id: `biology-cell-import-${index + 1}`,
      subjectId: "biology",
      chapterId: "biology-cell-unit-of-life",
      topicId: index % 2 === 0 ? "biology-cell-structure" : "biology-cell-organelles",
      questionText: `Importer order validation question ${index + 1}?`,
      explanation: "Option A is correct in this importer-only fixture.",
      difficulty: "MEDIUM",
      sourceType: "ORIGINAL",
      positiveMarks: 4,
      negativeMarks: 1,
      order: index + 1,
      isPublished: false,
      options: [
        { label: "A", text: "Correct option", isCorrect: true },
        { label: "B", text: "Distractor B", isCorrect: false },
        { label: "C", text: "Distractor C", isCorrect: false },
        { label: "D", text: "Distractor D", isCorrect: false },
      ],
    })),
  });
}

const currentHierarchy = [
  { slug: "physics", order: 1, chapters: [] },
  { slug: "chemistry", order: 2, chapters: [] },
  {
    slug: "biology",
    order: 3,
    chapters: Array.from({ length: 6 }, (_, index) => ({
      slug: index === 0 ? "cell-unit-of-life" : `existing-biology-chapter-${index + 1}`,
      order: index + 1,
      topics: [],
    })),
  },
];

test("preview preflight reports the imported Biology subject and chapter order collisions", () => {
  const parsed = parseAdminImportJson(biologyFiveQuestionBundle(1, 1));
  assert(parsed.bundle, parsed.errors.join(" "));
  assert.deepEqual(findHierarchyOrderConflicts(parsed.bundle, currentHierarchy), [
    "Subject biology uses order 1, already assigned to subject physics.",
    "Chapter biology-cell-unit-of-life uses order 1, already assigned to chapter cell-unit-of-life within subject biology.",
  ]);
});

test("corrected Biology hierarchy orders pass preflight while topic and question orders remain unchanged", () => {
  const parsed = parseAdminImportJson(biologyFiveQuestionBundle(3, 7));
  assert(parsed.bundle, parsed.errors.join(" "));
  assert.deepEqual(findHierarchyOrderConflicts(parsed.bundle, currentHierarchy), []);
  assert.deepEqual(parsed.bundle.topics.map((topic) => topic.order), [1, 2]);
  assert.deepEqual(parsed.bundle.questions.map((question) => question.order), [1, 2, 3, 4, 5]);
});

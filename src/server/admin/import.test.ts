import assert from "node:assert/strict";
import test from "node:test";
import { parseAdminImportJson } from "@/server/admin/import";

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

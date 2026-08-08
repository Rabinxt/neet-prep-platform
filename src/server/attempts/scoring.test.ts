import assert from "node:assert/strict";
import test from "node:test";
import { calculateAttemptScore, type ScoringQuestion } from "./scoring";

function question(overrides: Partial<ScoringQuestion> = {}): ScoringQuestion {
  return {
    id: "question-1",
    positiveMarks: 4,
    negativeMarks: 1,
    subjectName: "Physics",
    subjectSlug: "physics",
    subjectOrder: 1,
    selectedOptionId: "option-1",
    selectedOptionIsCorrect: true,
    checked: true,
    ...overrides,
  };
}

test("practice scores only checked responses", () => {
  const result = calculateAttemptScore("PRACTICE", [
    question(),
    question({ id: "question-2", selectedOptionIsCorrect: false }),
    question({ id: "question-3", checked: false }),
  ]);
  assert.deepEqual(result.questions.map((item) => item.outcome), [
    "CORRECT",
    "INCORRECT",
    "UNANSWERED",
  ]);
  assert.equal(result.score, 3);
  assert.equal(result.attempted, 2);
  assert.equal(result.unanswered, 1);
  assert.equal(result.accuracy, 50);
});

test("exam applies negative marking and leaves empty responses unanswered", () => {
  const result = calculateAttemptScore("MOCK_EXAM", [
    question(),
    question({ id: "question-2", selectedOptionIsCorrect: false, checked: false }),
    question({ id: "question-3", selectedOptionId: null, selectedOptionIsCorrect: null, checked: false }),
  ]);
  assert.equal(result.correct, 1);
  assert.equal(result.incorrect, 1);
  assert.equal(result.unanswered, 1);
  assert.equal(result.score, 3);
  assert.equal(result.maximumMarks, 12);
});

test("subject breakdown is stable and ordered", () => {
  const result = calculateAttemptScore("MOCK_EXAM", [
    question({ subjectName: "Biology", subjectSlug: "biology", subjectOrder: 3 }),
    question({ id: "question-2", subjectName: "Physics", subjectSlug: "physics", subjectOrder: 1, selectedOptionIsCorrect: false }),
  ]);
  assert.deepEqual(result.subjects.map((subject) => subject.slug), ["physics", "biology"]);
  assert.equal(result.subjects[0].score, -1);
  assert.equal(result.subjects[1].score, 4);
});

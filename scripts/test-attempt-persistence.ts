import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../src/server/db/client";
import {
  createPersistentAttempt,
  finalizeOwnedAttempt,
  loadOwnedAttempt,
} from "../src/server/attempts/service";

const prisma = getPrisma();
const sessionIds: string[] = [];
const attemptIds: string[] = [];

try {
  const questions = await prisma.question.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true },
  });
  assert.equal(questions.length, 2, "At least two published questions are required.");

  const [ownerA, ownerB] = await Promise.all([
    prisma.anonymousSession.create({ data: { tokenHash: `test-${randomUUID()}` } }),
    prisma.anonymousSession.create({ data: { tokenHash: `test-${randomUUID()}` } }),
  ]);
  sessionIds.push(ownerA.id, ownerB.id);

  const orderedIds = questions.map((question) => question.id).reverse();
  const attempt = await createPersistentAttempt({
    anonymousSessionId: ownerA.id,
    type: "MOCK_EXAM",
    name: "Persistence integration test",
    questionIds: orderedIds,
    configuration: { test: true },
    durationSeconds: 60,
  });
  attemptIds.push(attempt.id);

  const active = await loadOwnedAttempt(ownerA.id, attempt.id);
  assert(active?.status === "IN_PROGRESS");
  assert.deepEqual(
    active.questions.map((question) => question.subject.slug.length > 0),
    [true, true],
  );
  const serializedActive = JSON.stringify(active);
  assert(!serializedActive.includes("isCorrect"), "Active exam payload exposed correctness.");
  assert(!serializedActive.includes("explanation"), "Active exam payload exposed explanations.");
  assert.equal(await loadOwnedAttempt(ownerB.id, attempt.id), null, "Another owner could read the attempt.");

  const firstSnapshot = await prisma.attemptQuestion.findFirstOrThrow({
    where: { attemptId: attempt.id, order: 1 },
    include: { options: { orderBy: { order: "asc" } } },
  });
  assert.equal(firstSnapshot.sourceQuestionId, orderedIds[0], "Question order was not snapshotted exactly.");
  await prisma.attemptQuestion.update({
    where: { id: firstSnapshot.id },
    data: {
      selectedOptionId: firstSnapshot.options[0].id,
      responseStatus: "ANSWERED",
    },
  });
  const resumed = await loadOwnedAttempt(ownerA.id, attempt.id);
  assert(resumed?.status === "IN_PROGRESS");
  assert.equal(resumed.questions[0].selectedOptionId, firstSnapshot.options[0].id);

  await finalizeOwnedAttempt(ownerA.id, attempt.id);
  const completed = await loadOwnedAttempt(ownerA.id, attempt.id);
  assert(completed?.status === "COMPLETED");
  const firstScore = completed.overall.score;
  await finalizeOwnedAttempt(ownerA.id, attempt.id);
  const duplicate = await loadOwnedAttempt(ownerA.id, attempt.id);
  assert(duplicate?.status === "COMPLETED");
  assert.equal(duplicate.overall.score, firstScore, "Duplicate finalization changed the score.");

  const expiring = await createPersistentAttempt({
    anonymousSessionId: ownerA.id,
    type: "MOCK_EXAM",
    name: "Expiry integration test",
    questionIds: orderedIds,
    configuration: { test: true },
    durationSeconds: 60,
  });
  attemptIds.push(expiring.id);
  await prisma.attempt.update({
    where: { id: expiring.id },
    data: { expiresAt: new Date(Date.now() - 1_000) },
  });
  const expired = await loadOwnedAttempt(ownerA.id, expiring.id);
  assert(expired?.status === "EXPIRED", "Expired attempt was not finalized on load.");

  console.info("Attempt persistence integration checks passed.");
} finally {
  if (attemptIds.length > 0) {
    await prisma.attempt.deleteMany({ where: { id: { in: attemptIds } } });
  }
  if (sessionIds.length > 0) {
    await prisma.anonymousSession.deleteMany({ where: { id: { in: sessionIds } } });
  }
  await prisma.$disconnect();
}

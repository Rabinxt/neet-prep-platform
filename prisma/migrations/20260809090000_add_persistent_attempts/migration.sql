-- CreateEnum
CREATE TYPE "AttemptType" AS ENUM ('PRACTICE', 'MOCK_EXAM');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AttemptQuestionStatus" AS ENUM ('NOT_VISITED', 'NOT_ANSWERED', 'ANSWERED', 'MARKED_FOR_REVIEW', 'ANSWERED_AND_MARKED_FOR_REVIEW');

-- CreateTable
CREATE TABLE "AnonymousSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnonymousSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "anonymousSessionId" TEXT,
    "type" "AttemptType" NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "name" TEXT NOT NULL,
    "configuration" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL,
    "attemptedQuestions" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "incorrect" INTEGER NOT NULL DEFAULT 0,
    "unanswered" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "maximumMarks" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subjectBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptQuestion" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sourceQuestionId" TEXT,
    "order" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "sourceType" "QuestionSource" NOT NULL,
    "examYear" INTEGER,
    "positiveMarks" INTEGER NOT NULL,
    "negativeMarks" INTEGER NOT NULL,
    "subjectName" TEXT NOT NULL,
    "subjectSlug" TEXT NOT NULL,
    "subjectOrder" INTEGER NOT NULL,
    "chapterName" TEXT NOT NULL,
    "chapterSlug" TEXT NOT NULL,
    "topicName" TEXT,
    "topicSlug" TEXT,
    "selectedOptionId" TEXT,
    "responseStatus" "AttemptQuestionStatus" NOT NULL DEFAULT 'NOT_VISITED',
    "checkedAt" TIMESTAMP(3),
    "isCorrect" BOOLEAN,
    "marksAwarded" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttemptQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptQuestionOption" (
    "id" TEXT NOT NULL,
    "attemptQuestionId" TEXT NOT NULL,
    "sourceOptionId" TEXT,
    "optionText" TEXT NOT NULL,
    "optionLabel" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    CONSTRAINT "AttemptQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousSession_tokenHash_key" ON "AnonymousSession"("tokenHash");
CREATE INDEX "AnonymousSession_lastSeenAt_idx" ON "AnonymousSession"("lastSeenAt");
CREATE INDEX "Attempt_anonymousSessionId_type_status_updatedAt_idx" ON "Attempt"("anonymousSessionId", "type", "status", "updatedAt");
CREATE INDEX "Attempt_status_expiresAt_idx" ON "Attempt"("status", "expiresAt");
CREATE INDEX "AttemptQuestion_attemptId_responseStatus_idx" ON "AttemptQuestion"("attemptId", "responseStatus");
CREATE INDEX "AttemptQuestion_sourceQuestionId_idx" ON "AttemptQuestion"("sourceQuestionId");
CREATE INDEX "AttemptQuestion_selectedOptionId_idx" ON "AttemptQuestion"("selectedOptionId");
CREATE UNIQUE INDEX "AttemptQuestion_attemptId_order_key" ON "AttemptQuestion"("attemptId", "order");
CREATE UNIQUE INDEX "AttemptQuestion_attemptId_sourceQuestionId_key" ON "AttemptQuestion"("attemptId", "sourceQuestionId");
CREATE INDEX "AttemptQuestionOption_sourceOptionId_idx" ON "AttemptQuestionOption"("sourceOptionId");
CREATE UNIQUE INDEX "AttemptQuestionOption_attemptQuestionId_order_key" ON "AttemptQuestionOption"("attemptQuestionId", "order");
CREATE UNIQUE INDEX "AttemptQuestionOption_attemptQuestionId_optionLabel_key" ON "AttemptQuestionOption"("attemptQuestionId", "optionLabel");

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_anonymousSessionId_fkey" FOREIGN KEY ("anonymousSessionId") REFERENCES "AnonymousSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "AttemptQuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttemptQuestionOption" ADD CONSTRAINT "AttemptQuestionOption_attemptQuestionId_fkey" FOREIGN KEY ("attemptQuestionId") REFERENCES "AttemptQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

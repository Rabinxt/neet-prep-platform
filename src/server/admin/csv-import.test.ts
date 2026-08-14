import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  applyAdminCsvImportWithClient,
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  csvImportTestHelpers,
  parseAdminCsv,
  type CsvImportContext,
  type CsvHierarchy,
} from "@/server/admin/csv-import";
import { AdminValidationError } from "@/server/admin/validation";

const headers = "importId,subjectSlug,chapterSlug,topicSlug,difficulty,questionText,optionA,optionB,optionC,optionD,correctOption,explanation,source,sourceType,positiveMarks,negativeMarks,isPublished,publicationStatus,questionId,order,examYear";
const hierarchy: CsvHierarchy = [{
  id: "subject-db",
  slug: "biology",
  name: "Biology",
  chapters: [{
    id: "chapter-db",
    slug: "cell-unit-of-life",
    name: "Cell: The Unit of Life",
    topics: [{ id: "topic-db", slug: "cell-organelles", name: "Cell Organelles" }],
  }],
}];

function escape(value: string | number | boolean) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function row(overrides: Record<string, string | number | boolean> = {}) {
  const values: Record<string, string | number | boolean> = {
    importId: "csv-cell-001",
    subjectSlug: "biology",
    chapterSlug: "cell-unit-of-life",
    topicSlug: "cell-organelles",
    difficulty: "EASY",
    questionText: "Which organelle is known as the powerhouse of the cell?",
    optionA: "Golgi apparatus",
    optionB: "Mitochondrion",
    optionC: "Lysosome",
    optionD: "Ribosome",
    correctOption: "B",
    explanation: "Mitochondria produce ATP through cellular respiration.",
    source: "ORIGINAL",
    sourceType: "ORIGINAL",
    positiveMarks: 4,
    negativeMarks: 1,
    isPublished: true,
    publicationStatus: "PUBLISHED",
    questionId: "",
    order: 1,
    examYear: "",
    ...overrides,
  };
  return headers.split(",").map((key) => escape(values[key] ?? "")).join(",");
}

function file(content: string, name = "questions.csv", declaredSize?: number) {
  const bytes = new TextEncoder().encode(content);
  return {
    name,
    size: declaredSize ?? bytes.byteLength,
    async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); },
  };
}

async function prepare(content: string, context: CsvImportContext = { hierarchy, questions: [] }) {
  const parsed = await parseAdminCsv(file(content));
  return csvImportTestHelpers.prepareCsvImport(parsed, context);
}

test("valid CSV maps four options and the correct answer through shared validation", async () => {
  const prepared = await prepare(`${headers}\r\n${row()}`);
  assert.equal(prepared.preview.counts.newQuestions, 1);
  assert.equal(prepared.rows[0].input?.options.length, 4);
  assert.equal(prepared.rows[0].input?.options.find((option) => option.isCorrect)?.label, "B");
  assert.equal(prepared.rows[0].input?.examYear, null);
});

test("quoted commas, escaped quotes, multiline fields, CRLF, and LF parse safely", async () => {
  const content = `${headers}\r\n${row({
    questionText: 'A "quoted", multiline\nquestion?',
    explanation: "Line one, with comma.\nLine two.",
  })}\n`;
  const parsed = await parseAdminCsv(file(content));
  assert.equal(parsed.rows[0].input?.questionText, 'A "quoted", multiline\nquestion?');
  assert.match(parsed.rows[0].input?.explanation ?? "", /Line two/);
});

test("empty required fields, invalid correctOption, difficulty, and marks are row errors", async () => {
  const prepared = await prepare(`${headers}\n${row({ questionText: "", correctOption: "E", difficulty: "TRICKY", positiveMarks: "four" })}`);
  assert.equal(prepared.rows[0].status, "ERROR");
  assert.match(prepared.rows[0].messages.join(" "), /questionText is required/);
  assert.match(prepared.rows[0].messages.join(" "), /correctOption must be A/);
});

test("unknown subject, chapter, and topic are reported precisely", async () => {
  const subject = await prepare(`${headers}\n${row({ subjectSlug: "botany" })}`);
  const chapter = await prepare(`${headers}\n${row({ chapterSlug: "wrong-chapter" })}`);
  const topic = await prepare(`${headers}\n${row({ topicSlug: "wrong-topic" })}`);
  assert.match(subject.rows[0].messages.join(" "), /Unknown subject "botany"/);
  assert.match(chapter.rows[0].messages.join(" "), /Unknown chapter "wrong-chapter"/);
  assert.match(topic.rows[0].messages.join(" "), /Unknown topic "wrong-topic"/);
});

test("duplicate importId and normalized question text inside the CSV are blocking", async () => {
  const content = `${headers}\n${row()}\n${row({ questionText: "  WHICH organelle is known   as the powerhouse of the cell?  " })}`;
  const prepared = await prepare(content);
  assert(prepared.rows.every((item) => item.status === "ERROR"));
  assert.match(prepared.rows[0].messages.join(" "), /Duplicate importId/);
  assert.match(prepared.rows[0].messages.join(" "), /Duplicate normalized question/);
});

test("existing importId is skipped and exact text is a possible duplicate", async () => {
  const duplicateId = await prepare(`${headers}\n${row()}`, { hierarchy, questions: [{ importId: "csv-cell-001", questionText: "Different existing question" }] });
  const duplicateText = await prepare(`${headers}\n${row()}`, { hierarchy, questions: [{ importId: "other", questionText: "which organelle is known as the powerhouse of the cell?" }] });
  assert.equal(duplicateId.rows[0].status, "DUPLICATE_EXISTING");
  assert.equal(duplicateText.rows[0].status, "POSSIBLE_DUPLICATE");
});

test("ORIGINAL accepts blank examYear, rejects an actual year, and PYQ still requires a valid year", async () => {
  assert.equal((await prepare(`${headers}\n${row()}`)).rows[0].status, "READY");
  assert.equal((await prepare(`${headers}\n${row({ examYear: 2024 })}`)).rows[0].status, "ERROR");
  assert.equal((await prepare(`${headers}\n${row({ source: "PYQ", sourceType: "PYQ", examYear: 2024 })}`)).rows[0].status, "READY");
  assert.equal((await prepare(`${headers}\n${row({ source: "PYQ", sourceType: "PYQ", examYear: "" })}`)).rows[0].status, "ERROR");
});

test("duplicate option text and publication mismatch are rejected", async () => {
  const prepared = await prepare(`${headers}\n${row({ optionD: "Lysosome", publicationStatus: "DRAFT" })}`);
  assert.equal(prepared.rows[0].status, "ERROR");
  assert.match(prepared.rows[0].messages.join(" "), /Options A-D must not contain duplicate text/);
  assert.match(prepared.rows[0].messages.join(" "), /publicationStatus must agree/);
});

test("row and file limits are enforced before database work", async () => {
  const tooMany = `${headers}\n${Array.from({ length: CSV_MAX_ROWS + 1 }, (_, index) => row({ importId: `csv-limit-${index}` })).join("\n")}`;
  await assert.rejects(() => parseAdminCsv(file(tooMany)), (error) => error instanceof AdminValidationError && /too many rows/i.test(error.message));
  await assert.rejects(() => parseAdminCsv(file(headers, "large.csv", CSV_MAX_BYTES + 1)), (error) => error instanceof AdminValidationError && /too large/i.test(error.message));
});

test("strict headers and malformed quotes return sanitized messages", async () => {
  await assert.rejects(() => parseAdminCsv(file(`${headers},unexpected\n${row()},x`)), (error) => (
    error instanceof AdminValidationError && /Unexpected CSV columns/.test(error.fieldErrors.csv)
  ));
  await assert.rejects(() => parseAdminCsv(file(`${headers}\n"unclosed`)), (error) => (
    error instanceof AdminValidationError
    && /quoted fields|escaped quotes/.test(error.fieldErrors.csv)
    && !/stack|node_modules|DATABASE_URL/i.test(error.fieldErrors.csv)
  ));
});

test("near-identical text is a warning, never a blocking fuzzy decision", async () => {
  const context = { hierarchy, questions: [{ importId: "existing", questionText: "Which organelle is called the powerhouse of a living cell and produces usable ATP energy?" }] };
  const prepared = await prepare(`${headers}\n${row({ questionText: "Which organelle is called the powerhouse of the living cell and produces ATP energy?" })}`, context);
  assert.equal(prepared.rows[0].status, "WARNING");
  assert.equal(prepared.preview.hasBlockingErrors, false);
});

test("atomic apply creates expected options and an idempotent second upload skips", async () => {
  const stored: Array<{ importId: string | null; questionText: string }> = [];
  const created: unknown[] = [];
  const fakeClient = {
    subject: { findMany: async () => hierarchy },
    question: {
      findMany: async () => stored,
      create: async ({ data }: { data: { importId: string; questionText: string; options: { create: unknown[] } } }) => {
        stored.push({ importId: data.importId, questionText: data.questionText });
        created.push(data);
        return data;
      },
    },
    $transaction: async (task: (tx: unknown) => Promise<unknown>) => {
      const snapshot = [...stored];
      try { return await task(fakeClient); } catch (error) { stored.splice(0, stored.length, ...snapshot); throw error; }
    },
  } as unknown as PrismaClient;
  const csv = file(`${headers}\n${row()}`);
  assert.deepEqual(await applyAdminCsvImportWithClient(csv, false, fakeClient), { created: 1, skippedDuplicates: 0, warnings: 0, failed: 0 });
  assert.equal((created[0] as { options: { create: unknown[] } }).options.create.length, 4);
  assert.deepEqual(await applyAdminCsvImportWithClient(csv, false, fakeClient), { created: 0, skippedDuplicates: 1, warnings: 0, failed: 0 });
});

test("apply transaction remains atomic on a forced write failure", async () => {
  const stored: Array<{ importId: string | null; questionText: string }> = [];
  let createCount = 0;
  const fakeClient = {
    subject: { findMany: async () => hierarchy },
    question: {
      findMany: async () => stored,
      create: async ({ data }: { data: { importId: string; questionText: string } }) => {
        createCount += 1;
        if (createCount === 2) throw new Error("forced database failure containing secret material");
        stored.push({ importId: data.importId, questionText: data.questionText });
      },
    },
    $transaction: async (task: (tx: unknown) => Promise<unknown>) => {
      const snapshot = [...stored];
      try { return await task(fakeClient); } catch (error) { stored.splice(0, stored.length, ...snapshot); throw error; }
    },
  } as unknown as PrismaClient;
  const csv = file(`${headers}\n${row()}\n${row({ importId: "csv-cell-002", questionText: "Which cell organelle contains digestive enzymes?" })}`);
  await assert.rejects(() => applyAdminCsvImportWithClient(csv, false, fakeClient));
  assert.equal(stored.length, 0);
});

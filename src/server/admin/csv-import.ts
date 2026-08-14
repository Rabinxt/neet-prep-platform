import { Readable } from "node:stream";
import { parse } from "csv-parse";
import type { Difficulty, Prisma, QuestionSource } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/client";
import type { QuestionInput } from "@/server/admin/types";
import { AdminValidationError, validateQuestionInput } from "@/server/admin/validation";

export const CSV_MAX_BYTES = 1_000_000;
export const CSV_MAX_ROWS = 500;

export const CSV_REQUIRED_COLUMNS = [
  "importId", "subjectSlug", "chapterSlug", "topicSlug", "difficulty",
  "questionText", "optionA", "optionB", "optionC", "optionD", "correctOption",
  "explanation", "source", "sourceType", "positiveMarks", "negativeMarks",
  "isPublished", "publicationStatus",
] as const;
export const CSV_OPTIONAL_COLUMNS = ["questionId", "order", "examYear"] as const;
export const CSV_TEMPLATE_HEADERS = [...CSV_REQUIRED_COLUMNS, ...CSV_OPTIONAL_COLUMNS] as const;

const identifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allowedColumns = new Set<string>(CSV_TEMPLATE_HEADERS);
const optionLabels = ["A", "B", "C", "D"] as const;

export type CsvRowStatus = "READY" | "ERROR" | "DUPLICATE_EXISTING" | "POSSIBLE_DUPLICATE" | "WARNING";

export type CsvImportRowPreview = {
  row: number;
  importId: string;
  subject: string;
  chapter: string;
  topic: string;
  questionPreview: string;
  difficulty: string;
  status: CsvRowStatus;
  messages: string[];
};

export type CsvImportPreview = {
  filename: string;
  size: number;
  counts: {
    total: number;
    valid: number;
    errors: number;
    newQuestions: number;
    existingDuplicates: number;
    possibleDuplicates: number;
    warnings: number;
    skipped: number;
  };
  hasBlockingErrors: boolean;
  requiresWarningAcknowledgement: boolean;
  rows: CsvImportRowPreview[];
};

type CsvFileInput = { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };

type ParsedRow = {
  row: number;
  importId: string;
  questionId: string | null;
  subjectSlug: string;
  chapterSlug: string;
  topicSlug: string;
  input: QuestionInput | null;
  normalizedQuestion: string;
  errors: string[];
  warnings: string[];
};

type ParsedCsv = { filename: string; size: number; rows: ParsedRow[] };

export type CsvHierarchy = Array<{
  id: string;
  slug: string;
  name: string;
  chapters: Array<{
    id: string;
    slug: string;
    name: string;
    topics: Array<{ id: string; slug: string; name: string }>;
  }>;
}>;

export type CsvExistingQuestion = { importId: string | null; questionText: string };
export type CsvImportContext = { hierarchy: CsvHierarchy; questions: CsvExistingQuestion[] };

type PreparedRow = ParsedRow & {
  subjectId: string;
  chapterId: string;
  topicId: string;
  status: CsvRowStatus;
  messages: string[];
};

type PreparedImport = { preview: CsvImportPreview; rows: PreparedRow[] };

function requiredText(record: Record<string, string>, key: string, maximum: number, errors: string[]) {
  const value = (record[key] ?? "").trim();
  if (!value) errors.push(`${key} is required.`);
  else if (value.length > maximum) errors.push(`${key} exceeds ${maximum} characters.`);
  return value;
}

function optionalInteger(value: string, key: string, errors: string[], fallback: number | null) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (!/^-?\d+$/.test(trimmed)) {
    errors.push(`${key} must be an integer when provided.`);
    return Number.NaN;
  }
  return Number(trimmed);
}

function parseBoolean(value: string, errors: string[]) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  errors.push("isPublished must be true or false.");
  return false;
}

export function normalizeQuestionText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function tokenSimilarity(left: string, right: string) {
  const a = new Set(left.split(/[^a-z0-9]+/).filter((token) => token.length > 2));
  const b = new Set(right.split(/[^a-z0-9]+/).filter((token) => token.length > 2));
  if (a.size < 5 || b.size < 5) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function validateHeaders(headers: string[]) {
  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
  const unknown = headers.filter((header) => !allowedColumns.has(header));
  const missing = CSV_REQUIRED_COLUMNS.filter((header) => !headers.includes(header));
  if (duplicates.length) throw new Error(`Duplicate CSV columns: ${[...new Set(duplicates)].join(", ")}.`);
  if (unknown.length) throw new Error(`Unexpected CSV columns: ${unknown.join(", ")}.`);
  if (missing.length) throw new Error(`Missing required CSV columns: ${missing.join(", ")}.`);
  return headers;
}

function sanitizeParserError(error: unknown) {
  const candidate = error && typeof error === "object" ? error as { code?: unknown; lines?: unknown; message?: unknown } : {};
  const row = typeof candidate.lines === "number" ? ` near row ${candidate.lines}` : "";
  const code = typeof candidate.code === "string" ? candidate.code : "";
  if (code === "CSV_RECORD_INCONSISTENT_COLUMNS" || code === "CSV_RECORD_INCONSISTENT_FIELDS_LENGTH") {
    return `Malformed CSV${row}: each row must contain exactly the declared columns.`;
  }
  if (code === "CSV_QUOTE_NOT_CLOSED" || code === "CSV_INVALID_CLOSING_QUOTE" || code === "CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE") {
    return `Malformed CSV${row}: check quoted fields and escaped quotes.`;
  }
  const message = typeof candidate.message === "string" ? candidate.message : "";
  if (/^(Duplicate|Unexpected|Missing required) CSV columns:/.test(message)) return message;
  return `CSV could not be parsed${row}. Check its headers, delimiters, and quoted fields.`;
}

function assertCsvFile(file: CsvFileInput) {
  if (!file || typeof file.name !== "string" || typeof file.size !== "number" || typeof file.arrayBuffer !== "function") {
    throw new AdminValidationError("Choose a CSV file first.", { csv: "The uploaded file is invalid." });
  }
  if (!/\.csv$/i.test(file.name.trim())) {
    throw new AdminValidationError("Choose a .csv file.", { csv: "Only files with the .csv extension are accepted." });
  }
  if (file.size <= 0) throw new AdminValidationError("The CSV file is empty.", { csv: "Add a header and at least one question row." });
  if (file.size > CSV_MAX_BYTES) {
    throw new AdminValidationError("The CSV file is too large.", { csv: "CSV files must be 1 MB or smaller." });
  }
}

async function parseRecords(raw: string) {
  if (raw.includes("\0")) throw new AdminValidationError("CSV contains unsupported binary data.", { csv: "Upload a UTF-8 text CSV file." });
  return new Promise<Array<Record<string, string>>>((resolve, reject) => {
    const records: Array<Record<string, string>> = [];
    const parser = parse({
      bom: true,
      columns: (headers: string[]) => validateHeaders(headers.map((header) => header.trim())),
      delimiter: ",",
      encoding: "utf8",
      relax_column_count: false,
      skip_empty_lines: true,
      trim: true,
      max_record_size: 30_000,
    });
    parser.on("readable", () => {
      let record: Record<string, string> | null;
      while ((record = parser.read() as Record<string, string> | null)) {
        records.push(record);
        if (records.length > CSV_MAX_ROWS) parser.destroy(new Error("CSV_ROW_LIMIT"));
      }
    });
    parser.on("error", (error) => {
      if (error.message === "CSV_ROW_LIMIT") {
        reject(new AdminValidationError("CSV has too many rows.", { csv: `A maximum of ${CSV_MAX_ROWS} question rows is allowed.` }));
      } else reject(new AdminValidationError("CSV parsing failed.", { csv: sanitizeParserError(error) }));
    });
    parser.on("end", () => resolve(records));
    Readable.from([raw]).pipe(parser);
  });
}

function parseRow(record: Record<string, string>, index: number): ParsedRow {
  const row = index + 2;
  const errors: string[] = [];
  const warnings: string[] = [];
  const importId = requiredText(record, "importId", 120, errors);
  const questionId = (record.questionId ?? "").trim() || null;
  const subjectSlug = requiredText(record, "subjectSlug", 120, errors).toLowerCase();
  const chapterSlug = requiredText(record, "chapterSlug", 120, errors).toLowerCase();
  const topicSlug = requiredText(record, "topicSlug", 120, errors).toLowerCase();
  const questionText = requiredText(record, "questionText", 5_000, errors);
  const explanation = requiredText(record, "explanation", 10_000, errors);
  const correctOption = requiredText(record, "correctOption", 1, errors).toUpperCase();
  const source = requiredText(record, "source", 20, errors).toUpperCase();
  const sourceType = requiredText(record, "sourceType", 20, errors).toUpperCase();
  const publicationStatus = requiredText(record, "publicationStatus", 20, errors).toUpperCase();

  if (importId && !identifierPattern.test(importId)) errors.push("importId must use lowercase kebab-case.");
  if (questionId && (questionId.length > 100 || !identifierPattern.test(questionId))) errors.push("questionId must use lowercase kebab-case when provided.");
  else if (questionId) warnings.push("questionId is informational; the database will generate the internal ID.");
  for (const [name, value] of [["subjectSlug", subjectSlug], ["chapterSlug", chapterSlug], ["topicSlug", topicSlug]]) {
    if (value && !identifierPattern.test(value)) errors.push(`${name} must use lowercase kebab-case.`);
  }
  if (!optionLabels.includes(correctOption as typeof optionLabels[number])) errors.push("correctOption must be A, B, C, or D.");
  if (source !== sourceType) errors.push("source and sourceType must contain the same supported value.");
  if (!(["ORIGINAL", "SAMPLE", "PYQ"] as string[]).includes(source)) errors.push("source must be ORIGINAL, SAMPLE, or PYQ.");
  if (!(["ORIGINAL", "SAMPLE", "PYQ"] as string[]).includes(sourceType)) errors.push("sourceType must be ORIGINAL, SAMPLE, or PYQ.");
  if (!(["PUBLISHED", "DRAFT"] as string[]).includes(publicationStatus)) errors.push("publicationStatus must be PUBLISHED or DRAFT.");

  const isPublished = parseBoolean(record.isPublished ?? "", errors);
  if ((publicationStatus === "PUBLISHED") !== isPublished && (publicationStatus === "PUBLISHED" || publicationStatus === "DRAFT")) {
    errors.push("publicationStatus must agree with isPublished.");
  }
  const positiveMarks = optionalInteger(record.positiveMarks ?? "", "positiveMarks", errors, Number.NaN);
  const negativeMarks = optionalInteger(record.negativeMarks ?? "", "negativeMarks", errors, Number.NaN);
  const order = optionalInteger(record.order ?? "", "order", errors, 0);
  const examYear = optionalInteger(record.examYear ?? "", "examYear", errors, null);
  if (positiveMarks !== 4 || negativeMarks !== 1) warnings.push("Marks differ from the usual NEET convention of +4 / -1.");

  const optionTexts = optionLabels.map((label) => requiredText(record, `option${label}`, 1_000, errors));
  const normalizedOptions = optionTexts.map(normalizeQuestionText);
  if (new Set(normalizedOptions.filter(Boolean)).size !== normalizedOptions.filter(Boolean).length) {
    errors.push("Options A-D must not contain duplicate text.");
  }

  let input: QuestionInput | null = null;
  if (errors.length === 0) {
    try {
      input = validateQuestionInput({
        subjectId: subjectSlug,
        chapterId: chapterSlug,
        topicId: topicSlug,
        questionText,
        explanation,
        difficulty: (record.difficulty ?? "").trim().toUpperCase(),
        sourceType,
        examYear,
        positiveMarks,
        negativeMarks,
        order,
        isPublished,
        options: optionTexts.map((text, optionIndex) => ({
          text,
          isCorrect: optionLabels[optionIndex] === correctOption,
        })),
      });
    } catch (error) {
      if (error instanceof AdminValidationError) errors.push(...Object.values(error.fieldErrors));
      else errors.push("Question data is invalid.");
    }
  }

  return {
    row,
    importId,
    questionId,
    subjectSlug,
    chapterSlug,
    topicSlug,
    input,
    normalizedQuestion: normalizeQuestionText(questionText),
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}

export async function parseAdminCsv(file: CsvFileInput): Promise<ParsedCsv> {
  assertCsvFile(file);
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > CSV_MAX_BYTES) {
    throw new AdminValidationError("The CSV file is too large.", { csv: "CSV files must be 1 MB or smaller." });
  }
  let raw: string;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new AdminValidationError("CSV encoding is invalid.", { csv: "Save the file as UTF-8 and try again." });
  }
  const records = await parseRecords(raw);
  if (!records.length) throw new AdminValidationError("CSV has no question rows.", { csv: "Add at least one row beneath the header." });
  return { filename: file.name.trim().slice(0, 200), size: file.size, rows: records.map(parseRow) };
}

function prepareCsvImport(parsed: ParsedCsv, context: CsvImportContext): PreparedImport {
  const subjectBySlug = new Map(context.hierarchy.map((subject) => [subject.slug, subject]));
  const existingImportIds = new Set(context.questions.flatMap((question) => question.importId ? [question.importId] : []));
  const existingTexts = context.questions.map((question) => normalizeQuestionText(question.questionText)).filter(Boolean);
  const importIdCounts = new Map<string, number>();
  const textCounts = new Map<string, number>();
  for (const row of parsed.rows) {
    importIdCounts.set(row.importId, (importIdCounts.get(row.importId) ?? 0) + 1);
    textCounts.set(row.normalizedQuestion, (textCounts.get(row.normalizedQuestion) ?? 0) + 1);
  }

  const rows: PreparedRow[] = parsed.rows.map((row) => {
    const errors = [...row.errors];
    const warnings = [...row.warnings];
    const subject = subjectBySlug.get(row.subjectSlug);
    const chapter = subject?.chapters.find((item) => item.slug === row.chapterSlug);
    const topic = chapter?.topics.find((item) => item.slug === row.topicSlug);
    if (!subject && row.subjectSlug) errors.push(`Unknown subject "${row.subjectSlug}".`);
    else if (!chapter && row.chapterSlug) errors.push(`Unknown chapter "${row.chapterSlug}" for ${subject?.name ?? row.subjectSlug}.`);
    else if (!topic && row.topicSlug) errors.push(`Unknown topic "${row.topicSlug}" under chapter "${row.chapterSlug}".`);
    if ((importIdCounts.get(row.importId) ?? 0) > 1 && row.importId) errors.push(`Duplicate importId "${row.importId}" inside this CSV.`);
    if ((textCounts.get(row.normalizedQuestion) ?? 0) > 1 && row.normalizedQuestion) errors.push("Duplicate normalized question text inside this CSV.");

    const exactExisting = row.normalizedQuestion && existingTexts.includes(row.normalizedQuestion);
    const nearExisting = !exactExisting && row.normalizedQuestion
      ? existingTexts.some((text) => tokenSimilarity(row.normalizedQuestion, text) >= 0.85)
      : false;
    const nearUpload = !exactExisting && row.normalizedQuestion
      ? parsed.rows.some((other) => other.row !== row.row && tokenSimilarity(row.normalizedQuestion, other.normalizedQuestion) >= 0.85)
      : false;
    if (exactExisting) warnings.push("Exact normalized question text already exists in the question bank.");
    else if (nearExisting || nearUpload) warnings.push("A near-identical question may already exist; review before importing.");

    let status: CsvRowStatus = "READY";
    if (errors.length) status = "ERROR";
    else if (existingImportIds.has(row.importId)) status = "DUPLICATE_EXISTING";
    else if (exactExisting) status = "POSSIBLE_DUPLICATE";
    else if (nearExisting || nearUpload || warnings.length) status = "WARNING";
    return {
      ...row,
      subjectId: subject?.id ?? "",
      chapterId: chapter?.id ?? "",
      topicId: topic?.id ?? "",
      status,
      messages: status === "DUPLICATE_EXISTING"
        ? [`importId "${row.importId}" already exists and will be skipped.`]
        : [...errors, ...warnings],
    };
  });

  const errorCount = rows.filter((row) => row.status === "ERROR").length;
  const duplicateCount = rows.filter((row) => row.status === "DUPLICATE_EXISTING").length;
  const possibleCount = rows.filter((row) => row.status === "POSSIBLE_DUPLICATE").length;
  const warningCount = rows.filter((row) => row.status === "WARNING").length;
  const previewRows = rows.map((row): CsvImportRowPreview => ({
    row: row.row,
    importId: row.importId,
    subject: row.subjectSlug,
    chapter: row.chapterSlug,
    topic: row.topicSlug,
    questionPreview: row.input?.questionText ?? row.normalizedQuestion.slice(0, 240),
    difficulty: row.input?.difficulty ?? "",
    status: row.status,
    messages: row.messages,
  }));
  return {
    rows,
    preview: {
      filename: parsed.filename,
      size: parsed.size,
      counts: {
        total: rows.length,
        valid: rows.length - errorCount,
        errors: errorCount,
        newQuestions: rows.length - errorCount - duplicateCount,
        existingDuplicates: duplicateCount,
        possibleDuplicates: possibleCount,
        warnings: warningCount,
        skipped: duplicateCount,
      },
      hasBlockingErrors: errorCount > 0,
      requiresWarningAcknowledgement: possibleCount + warningCount > 0,
      rows: previewRows,
    },
  };
}

async function loadCsvContext(
  client: ReturnType<typeof getPrisma> | Prisma.TransactionClient = getPrisma(),
): Promise<CsvImportContext> {
  const [hierarchy, questions] = await Promise.all([
    client.subject.findMany({
      select: { id: true, slug: true, name: true, chapters: { select: { id: true, slug: true, name: true, topics: { select: { id: true, slug: true, name: true } } } } },
    }),
    client.question.findMany({ select: { importId: true, questionText: true } }),
  ]);
  return { hierarchy, questions };
}

export async function previewAdminCsvImport(file: CsvFileInput) {
  const parsed = await parseAdminCsv(file);
  return prepareCsvImport(parsed, await loadCsvContext()).preview;
}

export type CsvImportResult = { created: number; skippedDuplicates: number; warnings: number; failed: number };

export async function applyAdminCsvImportWithClient(
  file: CsvFileInput,
  acknowledgeWarnings: boolean,
  client: ReturnType<typeof getPrisma>,
): Promise<CsvImportResult> {
  const parsed = await parseAdminCsv(file);
  const prepared = prepareCsvImport(parsed, await loadCsvContext(client));
  if (prepared.preview.hasBlockingErrors) {
    throw new AdminValidationError("CSV contains blocking errors.", { csv: "Correct every ERROR row and validate the file again." });
  }
  if (prepared.preview.requiresWarningAcknowledgement && acknowledgeWarnings !== true) {
    throw new AdminValidationError("Review and acknowledge CSV warnings.", { csv: "Possible duplicates and warnings require explicit acknowledgement." });
  }

  return client.$transaction(async (tx) => {
    const transactionContext = await loadCsvContext(tx);
    const current = prepareCsvImport(parsed, transactionContext);
    if (current.preview.hasBlockingErrors) {
      throw new AdminValidationError("CSV is no longer valid.", { csv: "Hierarchy content changed after preview. Validate the CSV again." });
    }
    if (current.preview.requiresWarningAcknowledgement && acknowledgeWarnings !== true) {
      throw new AdminValidationError("CSV warnings changed after preview.", { csv: "Review the latest duplicate warnings and confirm again." });
    }
    const existing = new Set(transactionContext.questions.flatMap((question) => question.importId ? [question.importId] : []));
    const creatable = current.rows.filter((row) => row.status !== "ERROR" && !existing.has(row.importId));
    for (const row of creatable) {
      if (!row.input || !row.subjectId || !row.chapterId || !row.topicId) {
        throw new AdminValidationError("CSV is no longer valid.", { csv: `Row ${row.row} hierarchy could not be resolved.` });
      }
      await tx.question.create({
        data: {
          importId: row.importId,
          subjectId: row.subjectId,
          chapterId: row.chapterId,
          topicId: row.topicId,
          questionText: row.input.questionText,
          explanation: row.input.explanation,
          difficulty: row.input.difficulty as Difficulty,
          sourceType: row.input.sourceType as QuestionSource,
          examYear: row.input.examYear,
          positiveMarks: row.input.positiveMarks,
          negativeMarks: row.input.negativeMarks,
          order: row.input.order,
          isPublished: row.input.isPublished,
          options: { create: row.input.options.map((option, index) => ({ optionLabel: option.label, optionText: option.text, order: index + 1, isCorrect: option.isCorrect })) },
        },
      });
    }
    return {
      created: creatable.length,
      skippedDuplicates: current.rows.length - creatable.length,
      warnings: current.preview.counts.warnings + current.preview.counts.possibleDuplicates,
      failed: 0,
    };
  }, { timeout: 120_000 });
}

export async function applyAdminCsvImport(file: CsvFileInput, acknowledgeWarnings: boolean): Promise<CsvImportResult> {
  return applyAdminCsvImportWithClient(file, acknowledgeWarnings, getPrisma());
}

export const csvImportTestHelpers = { prepareCsvImport, sanitizeParserError, tokenSimilarity };

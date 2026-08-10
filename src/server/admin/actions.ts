"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import type { AdminActionResult } from "@/server/admin/types";
import { AdminValidationError } from "@/server/admin/validation";
import {
  bulkSetAdminQuestionPublication,
  createAdminQuestion,
  deleteAdminQuestion,
  setAdminQuestionPublication,
  updateAdminQuestion,
} from "@/server/admin/questions";
import {
  createAdminChapter,
  createAdminSubject,
  createAdminTopic,
  deleteAdminChapter,
  deleteAdminSubject,
  deleteAdminTopic,
  updateAdminChapter,
  updateAdminSubject,
  updateAdminTopic,
} from "@/server/admin/hierarchy";
import { applyAdminImport, previewAdminImport } from "@/server/admin/import";

function failure(error: unknown, fallback: string): AdminActionResult {
  if (error instanceof AdminValidationError) {
    return { ok: false, message: error.message, fieldErrors: error.fieldErrors };
  }
  return { ok: false, message: fallback };
}

function prismaErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^P\d{4}$/.test(code) ? code : null;
}

function importFailure(error: unknown): AdminActionResult {
  if (error instanceof AdminValidationError) return failure(error, "Import could not be applied.");

  const code = prismaErrorCode(error);
  if (process.env.NODE_ENV !== "production") {
    console.error("Admin import failed.", { prismaCode: code ?? "unavailable" });
  }
  const details = code === "P2002"
    ? "A unique hierarchy order, slug, or question import ID conflicts with existing content. Re-run Validate and Preview after checking the reported identifiers."
    : code === "P2003"
      ? "A hierarchy relationship changed or is unavailable. Re-run Validate and Preview before applying."
      : code === "P2028"
        ? "The database transaction could not complete. No partial content was saved."
        : "The database rejected the import. In development, check the server log for the sanitized Prisma diagnostic code.";
  return {
    ok: false,
    message: "Import failed and no partial changes were saved.",
    fieldErrors: { import: details },
  };
}

function isSafeAdminIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

function refreshContent() {
  revalidatePath("/admin");
  revalidatePath("/admin/questions");
  revalidatePath("/questions");
  revalidatePath("/practice");
  revalidatePath("/mock-tests");
  revalidatePath("/subjects");
}

export async function createQuestionAction(input: unknown): Promise<AdminActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const question = await createAdminQuestion(input);
    refreshContent();
    return { ok: true, message: "Question created.", data: question };
  } catch (error) {
    return failure(error, "Question could not be created. Check for conflicting content and try again.");
  }
}

export async function updateQuestionAction(id: string, input: unknown): Promise<AdminActionResult<{ id: string }>> {
  await requireAdmin();
  if (!isSafeAdminIdentifier(id)) return { ok: false, message: "Question identifier is invalid." };
  try {
    const question = await updateAdminQuestion(id, input);
    refreshContent();
    revalidatePath(`/admin/questions/${id}/edit`);
    return { ok: true, message: "Question changes saved.", data: question };
  } catch (error) {
    return failure(error, "Question changes could not be saved. Check for conflicting content and try again.");
  }
}

export async function setQuestionPublicationAction(id: string, isPublished: boolean): Promise<AdminActionResult> {
  await requireAdmin();
  if (!isSafeAdminIdentifier(id) || typeof isPublished !== "boolean") {
    return { ok: false, message: "Publication request is invalid." };
  }
  try {
    await setAdminQuestionPublication(id, isPublished);
    refreshContent();
    return { ok: true, message: isPublished ? "Question published." : "Question unpublished." };
  } catch (error) {
    return failure(error, "Publication status could not be changed.");
  }
}

export async function bulkSetQuestionPublicationAction(ids: unknown, isPublished: boolean): Promise<AdminActionResult> {
  await requireAdmin();
  if (typeof isPublished !== "boolean") return { ok: false, message: "Publication request is invalid." };
  try {
    const result = await bulkSetAdminQuestionPublication(ids, isPublished);
    refreshContent();
    return { ok: true, message: `${result.count} question${result.count === 1 ? "" : "s"} ${isPublished ? "published" : "unpublished"}.` };
  } catch (error) {
    return failure(error, "Bulk publication status could not be changed.");
  }
}

export async function deleteQuestionAction(id: string): Promise<AdminActionResult> {
  await requireAdmin();
  if (!isSafeAdminIdentifier(id)) return { ok: false, message: "Question identifier is invalid." };
  try {
    await deleteAdminQuestion(id);
    refreshContent();
    return { ok: true, message: "Live question deleted. Historical attempt snapshots were preserved." };
  } catch (error) {
    return failure(error, "Question could not be deleted.");
  }
}

type HierarchyKind = "subject" | "chapter" | "topic";

function isHierarchyKind(value: unknown): value is HierarchyKind {
  return value === "subject" || value === "chapter" || value === "topic";
}

const hierarchyMutations = {
  subject: { create: createAdminSubject, update: updateAdminSubject, delete: deleteAdminSubject },
  chapter: { create: createAdminChapter, update: updateAdminChapter, delete: deleteAdminChapter },
  topic: { create: createAdminTopic, update: updateAdminTopic, delete: deleteAdminTopic },
};

export async function saveHierarchyAction(
  kind: HierarchyKind,
  id: string | null,
  input: unknown,
): Promise<AdminActionResult<{ id: string }>> {
  await requireAdmin();
  if (!isHierarchyKind(kind)) return { ok: false, message: "Hierarchy type is invalid." };
  if (id !== null && !isSafeAdminIdentifier(id)) return { ok: false, message: "Hierarchy identifier is invalid." };
  try {
    const saved = id
      ? await hierarchyMutations[kind].update(id, input)
      : await hierarchyMutations[kind].create(input);
    refreshContent();
    revalidatePath(`/admin/${kind === "subject" ? "subjects" : `${kind}s`}`);
    return { ok: true, message: `${kind[0].toUpperCase()}${kind.slice(1)} ${id ? "updated" : "created"}.`, data: saved };
  } catch (error) {
    return failure(error, `${kind[0].toUpperCase()}${kind.slice(1)} could not be saved. Check slug and order conflicts.`);
  }
}

export async function deleteHierarchyAction(kind: HierarchyKind, id: string): Promise<AdminActionResult> {
  await requireAdmin();
  if (!isHierarchyKind(kind)) return { ok: false, message: "Hierarchy type is invalid." };
  if (!isSafeAdminIdentifier(id)) return { ok: false, message: "Hierarchy identifier is invalid." };
  try {
    await hierarchyMutations[kind].delete(id);
    refreshContent();
    revalidatePath(`/admin/${kind === "subject" ? "subjects" : `${kind}s`}`);
    return { ok: true, message: `${kind[0].toUpperCase()}${kind.slice(1)} deleted.` };
  } catch (error) {
    return failure(error, `${kind[0].toUpperCase()}${kind.slice(1)} could not be deleted.`);
  }
}

export async function previewImportAction(raw: string): Promise<AdminActionResult<Awaited<ReturnType<typeof previewAdminImport>>>> {
  await requireAdmin();
  try {
    const preview = await previewAdminImport(raw);
    return { ok: true, message: "Import is valid and ready for confirmation.", data: preview };
  } catch (error) {
    return failure(error, "Import could not be validated.");
  }
}

export async function applyImportAction(raw: string): Promise<AdminActionResult<Awaited<ReturnType<typeof applyAdminImport>>>> {
  await requireAdmin();
  try {
    const result = await applyAdminImport(raw);
    refreshContent();
    revalidatePath("/admin/import");
    return { ok: true, message: "Content imported in one transaction.", data: result };
  } catch (error) {
    return importFailure(error);
  }
}

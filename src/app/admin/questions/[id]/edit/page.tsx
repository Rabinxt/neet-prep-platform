import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionForm } from "@/components/admin/question-form";
import { getAdminQuestion, getAdminTaxonomy } from "@/server/admin/questions";
import { requireAdmin } from "@/server/auth/session";

export const metadata: Metadata = { title: "Edit Question | Admin" };

export default async function EditAdminQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [question, taxonomy] = await Promise.all([getAdminQuestion(id), getAdminTaxonomy()]);
  if (!question || question.options.length !== 4) notFound();
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><Link href="/admin/questions" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">← Questions</Link><h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Edit question</h1><p className="mt-2 text-slate-600">Changes affect future sessions only. Existing attempt snapshots remain unchanged.</p></div>{question.importId ? <span className="text-xs font-semibold text-slate-500">Import ID: {question.importId}</span> : null}</div>
    <QuestionForm
      taxonomy={taxonomy}
      questionId={question.id}
      initialValue={{
        subjectId: question.subjectId,
        chapterId: question.chapterId,
        topicId: question.topicId,
        questionText: question.questionText,
        explanation: question.explanation ?? "",
        difficulty: question.difficulty,
        sourceType: question.sourceType,
        examYear: question.examYear,
        positiveMarks: question.positiveMarks,
        negativeMarks: question.negativeMarks,
        order: question.order,
        isPublished: question.isPublished,
        options: question.options.map((option, index) => ({
          label: (["A", "B", "C", "D"] as const)[index],
          text: option.optionText,
          isCorrect: option.isCorrect,
        })),
      }}
    />
  </div>;
}


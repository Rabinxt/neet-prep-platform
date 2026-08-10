import type { Metadata } from "next";
import Link from "next/link";
import { QuestionForm } from "@/components/admin/question-form";
import { getAdminTaxonomy } from "@/server/admin/questions";
import { requireAdmin } from "@/server/auth/session";

export const metadata: Metadata = { title: "Add Question | Admin" };

export default async function NewAdminQuestionPage() {
  await requireAdmin();
  const taxonomy = await getAdminTaxonomy();
  return <div className="space-y-6">
    <div><Link href="/admin/questions" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">← Questions</Link><h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Create a live question</h1><p className="mt-2 text-slate-600">Draft carefully, validate the hierarchy, then publish when it is student-ready.</p></div>
    <QuestionForm taxonomy={taxonomy} />
  </div>;
}


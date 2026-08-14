import type { Metadata } from "next";
import { JsonImportPanel } from "@/components/admin/import-panel";
import { CsvImportPanel } from "@/components/admin/csv-import-panel";
import { requireAdmin } from "@/server/auth/session";

export const metadata: Metadata = { title: "Content Import | Admin" };
export default async function AdminImportPage() {
  await requireAdmin();
  return <div className="space-y-10"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Controlled ingestion</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Import content</h1><p className="mt-2 max-w-3xl text-slate-600">Use the production CSV workflow for existing syllabus hierarchy. Structured JSON remains available below as the advanced hierarchy-capable fallback.</p></div><CsvImportPanel /><details className="border-t border-slate-300 pt-7"><summary className="min-h-12 cursor-pointer text-lg font-black text-slate-800 focus-visible:outline-2 focus-visible:outline-emerald-700">Advanced: structured JSON importer</summary><div className="mt-6"><JsonImportPanel /></div></details></div>;
}

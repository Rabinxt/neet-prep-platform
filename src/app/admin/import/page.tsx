import type { Metadata } from "next";
import { ImportPanel } from "@/components/admin/import-panel";
import { requireAdmin } from "@/server/auth/session";

export const metadata: Metadata = { title: "Content Import | Admin" };
export default async function AdminImportPage() {
  await requireAdmin();
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Controlled ingestion</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Import content</h1><p className="mt-2 max-w-3xl text-slate-600">Validate a bounded structured JSON bundle, inspect its database impact, then explicitly apply it as one atomic operation.</p></div><ImportPanel /></div>;
}

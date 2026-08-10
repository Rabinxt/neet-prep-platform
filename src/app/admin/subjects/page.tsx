import type { Metadata } from "next";
import { HierarchyManager } from "@/components/admin/hierarchy-manager";
import { listAdminHierarchy } from "@/server/admin/hierarchy";
import { requireAdmin } from "@/server/auth/session";

export const metadata: Metadata = { title: "Subjects | Admin" };
export default async function AdminSubjectsPage() {
  await requireAdmin();
  const hierarchy = await listAdminHierarchy();
  const subjects = hierarchy.map((subject) => ({ id: subject.id, name: subject.name, chapters: subject.chapters.map((chapter) => ({ id: chapter.id, name: chapter.name })) }));
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Academic hierarchy</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Subjects</h1><p className="mt-2 text-slate-600">Edit labels and ordering without casually cascading through the content library.</p></div><HierarchyManager kind="subject" subjects={subjects} items={hierarchy.map((subject) => ({ id: subject.id, name: subject.name, slug: subject.slug, description: subject.description, order: subject.order, childCount: subject._count.chapters, questionCount: subject._count.questions }))} /></div>;
}


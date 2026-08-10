import type { Metadata } from "next";
import { HierarchyManager } from "@/components/admin/hierarchy-manager";
import { listAdminHierarchy } from "@/server/admin/hierarchy";
import { requireAdmin } from "@/server/auth/session";

export const metadata: Metadata = { title: "Chapters | Admin" };
export default async function AdminChaptersPage() {
  await requireAdmin();
  const hierarchy = await listAdminHierarchy();
  const subjects = hierarchy.map((subject) => ({ id: subject.id, name: subject.name, chapters: subject.chapters.map((chapter) => ({ id: chapter.id, name: chapter.name })) }));
  const items = hierarchy.flatMap((subject) => subject.chapters.map((chapter) => ({ id: chapter.id, name: chapter.name, slug: chapter.slug, description: chapter.description, order: chapter.order, parentId: subject.id, parentName: subject.name, childCount: chapter._count.topics, questionCount: chapter._count.questions })));
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Academic hierarchy</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Chapters</h1><p className="mt-2 text-slate-600">A chapter with questions cannot move subjects or be deleted until its content is reassigned.</p></div><HierarchyManager kind="chapter" subjects={subjects} items={items} /></div>;
}


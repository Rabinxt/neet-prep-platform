import type { Metadata } from "next";
import { HierarchyManager } from "@/components/admin/hierarchy-manager";
import { listAdminHierarchy } from "@/server/admin/hierarchy";
import { requireAdmin } from "@/server/auth/session";

export const metadata: Metadata = { title: "Topics | Admin" };
export default async function AdminTopicsPage() {
  await requireAdmin();
  const hierarchy = await listAdminHierarchy();
  const subjects = hierarchy.map((subject) => ({ id: subject.id, name: subject.name, chapters: subject.chapters.map((chapter) => ({ id: chapter.id, name: chapter.name })) }));
  const items = hierarchy.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.topics.map((topic) => ({ id: topic.id, name: topic.name, slug: topic.slug, description: topic.description, order: topic.order, parentId: chapter.id, parentName: `${subject.name} / ${chapter.name}`, childCount: 0, questionCount: topic._count.questions }))));
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Academic hierarchy</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Topics</h1><p className="mt-2 text-slate-600">Question-linked topics stay protected until their live questions are reassigned or cleared.</p></div><HierarchyManager kind="topic" subjects={subjects} items={items} /></div>;
}

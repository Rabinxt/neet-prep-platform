"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteHierarchyAction, saveHierarchyAction } from "@/server/admin/actions";

type Kind = "subject" | "chapter" | "topic";
type Item = {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
  parentId?: string;
  parentName?: string;
  childCount: number;
  questionCount: number;
};
type SubjectOption = { id: string; name: string; chapters: Array<{ id: string; name: string }> };
type EditValue = { name: string; slug: string; description: string; order: number; parentId?: string };

const control = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

function HierarchyFields({
  kind,
  value,
  setValue,
  subjects,
}: {
  kind: Kind;
  value: EditValue;
  setValue: (next: EditValue) => void;
  subjects: SubjectOption[];
}) {
  const parentChapter = subjects.flatMap((subject) => subject.chapters.map((chapter) => ({ ...chapter, subjectId: subject.id }))).find((chapter) => chapter.id === value.parentId);
  const [topicSubjectId, setTopicSubjectId] = useState(parentChapter?.subjectId ?? subjects[0]?.id ?? "");
  const topicChapters = subjects.find((subject) => subject.id === topicSubjectId)?.chapters ?? [];
  return <div className="grid gap-3 md:grid-cols-2">
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Name<input className={`${control} mt-1`} maxLength={120} value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} required /></label>
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Slug<input className={`${control} mt-1`} maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={value.slug} onChange={(event) => setValue({ ...value, slug: event.target.value.toLowerCase() })} required /></label>
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Description<input className={`${control} mt-1`} maxLength={500} value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })} /></label>
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Order<input className={`${control} mt-1`} type="number" min={0} max={10000} value={value.order} onChange={(event) => setValue({ ...value, order: Number(event.target.value) })} required /></label>
    {kind === "chapter" ? <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject<select className={`${control} mt-1`} value={value.parentId} onChange={(event) => setValue({ ...value, parentId: event.target.value })}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label> : null}
    {kind === "topic" ? <><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject<select className={`${control} mt-1`} value={topicSubjectId} onChange={(event) => { setTopicSubjectId(event.target.value); setValue({ ...value, parentId: subjects.find((subject) => subject.id === event.target.value)?.chapters[0]?.id ?? "" }); }}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Chapter<select className={`${control} mt-1`} value={value.parentId} onChange={(event) => setValue({ ...value, parentId: event.target.value })}>{topicChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}</select></label></> : null}
  </div>;
}

function ItemEditor({ kind, item, subjects }: { kind: Kind; item: Item; subjects: SubjectOption[] }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<EditValue>({ name: item.name, slug: item.slug, description: item.description, order: item.order, parentId: item.parentId });
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const save = () => startTransition(async () => {
    const result = await saveHierarchyAction(kind, item.id, value);
    setMessage(result.message);
    if (result.ok) { setEditing(false); window.location.reload(); }
  });
  const remove = () => {
    if (!window.confirm(`Delete ${item.name}? This is blocked when dependent content exists.`)) return;
    startTransition(async () => {
      const result = await deleteHierarchyAction(kind, item.id);
      setMessage(result.message);
      if (result.ok) window.location.reload();
    });
  };
  return <article className="border-t border-slate-200 p-4 first:border-t-0 sm:p-5">
    {editing ? <form onSubmit={(event) => { event.preventDefault(); save(); }}><HierarchyFields kind={kind} value={value} setValue={setValue} subjects={subjects} /><div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>{message ? <span role="status" className="text-sm font-semibold text-red-700">{message}</span> : null}</div></form> : <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_10rem] lg:items-center">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{item.name}</h2><code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.slug}</code></div><p className="mt-1 line-clamp-1 text-sm text-slate-500">{item.description || "No description"}</p>{item.parentName ? <p className="mt-1 text-xs font-semibold text-emerald-700">{item.parentName}</p> : null}</div>
      <div className="text-xs text-slate-500"><span className="font-bold text-slate-700">Order {item.order}</span><span className="mx-2">·</span>{item.childCount} children<span className="mx-2">·</span>{item.questionCount} questions</div>
      <div className="flex justify-start gap-1 lg:justify-end"><button onClick={() => setEditing(true)} className="rounded-lg px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50">Edit</button><button disabled={isPending} onClick={remove} className="rounded-lg px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Delete</button></div>
      {message ? <p role="status" className="text-sm font-semibold text-red-700 lg:col-span-3">{message}</p> : null}
    </div>}
  </article>;
}

export function HierarchyManager({ kind, items, subjects }: { kind: Kind; items: Item[]; subjects: SubjectOption[] }) {
  const initialParent = kind === "chapter" ? subjects[0]?.id : kind === "topic" ? subjects[0]?.chapters[0]?.id : undefined;
  const blank = useMemo<EditValue>(() => ({ name: "", slug: "", description: "", order: items.length + 1, parentId: initialParent }), [initialParent, items.length]);
  const [value, setValue] = useState(blank);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const label = kind[0].toUpperCase() + kind.slice(1);
  const create = () => startTransition(async () => {
    const result = await saveHierarchyAction(kind, null, value);
    setMessage(result.message);
    if (result.ok) { setValue(blank); window.location.reload(); }
  });
  return <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
    <form onSubmit={(event) => { event.preventDefault(); create(); }} className="h-fit border border-slate-800 bg-slate-950 p-5 text-white shadow-sm xl:sticky xl:top-8">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">New taxonomy item</p><h2 className="mt-2 text-xl font-black">Add {kind}</h2>
      <div className="mt-5 [&_label]:text-slate-300"><HierarchyFields kind={kind} value={value} setValue={setValue} subjects={subjects} /></div>
      {message ? <p role="status" className="mt-3 text-sm font-semibold text-amber-300">{message}</p> : null}
      <Button className="mt-5 w-full" disabled={isPending}>{isPending ? "Adding…" : `Add ${label}`}</Button>
    </form>
    <section className="border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Current structure</p><h2 className="mt-1 text-lg font-black">{items.length} {kind}{items.length === 1 ? "" : "s"}</h2></div><p className="max-w-sm text-right text-xs leading-5 text-slate-500">Deletion is blocked while valuable dependent content remains.</p></div>{items.map((item) => <ItemEditor key={item.id} kind={kind} item={item} subjects={subjects} />)}</section>
  </div>;
}

import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="animate-pulse py-12 sm:py-16" aria-label="Loading page" role="status">
      <div className="h-3 w-28 rounded-full bg-slate-200" />
      <div className="mt-5 h-11 max-w-xl rounded-xl bg-slate-200" />
      <div className="mt-4 h-5 max-w-2xl rounded-lg bg-slate-200" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-56 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="size-11 rounded-xl bg-slate-100" />
            <div className="mt-6 h-5 w-2/3 rounded bg-slate-100" />
            <div className="mt-3 h-4 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </Container>
  );
}

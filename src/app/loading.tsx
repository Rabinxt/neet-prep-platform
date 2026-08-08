import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="animate-pulse py-12" aria-label="Loading page" role="status">
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="mt-5 h-10 max-w-xl rounded bg-slate-200" />
      <div className="mt-4 h-5 max-w-2xl rounded bg-slate-200" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-56 rounded-2xl border border-slate-200 bg-white" />)}
      </div>
      <span className="sr-only">Loading…</span>
    </Container>
  );
}

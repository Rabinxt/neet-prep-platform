import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ClockIcon, TargetIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "NEET Mock Tests",
  description: "Prepare for exam day with structured NEET mock tests.",
};

const tests = [
  { title: "NEET Full Syllabus Mock 01", questions: "180 questions", duration: "180 minutes", label: "Full syllabus" },
  { title: "Physics Section Test 01", questions: "45 questions", duration: "50 minutes", label: "Subject test" },
  { title: "Biology High-Yield Test 01", questions: "90 questions", duration: "90 minutes", label: "Revision test" },
];

export default function MockTestsPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <Container className="py-14 sm:py-18">
          <p className="text-sm font-bold uppercase tracking-wider text-green-700">Exam practice</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Mock tests built for exam-day confidence</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Practise full-length and subject tests in a focused interface that reflects real exam decisions.</p>
        </Container>
      </section>
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div><h2 className="text-2xl font-bold">Sample test library</h2><p className="mt-2 text-slate-600">Preview content for the Phase 0 interface.</p></div>
            <span className="hidden rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 sm:block">Tests are not active yet</span>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {tests.map((test) => (
              <Card key={test.title} className="flex flex-col p-6">
                <span className="w-fit rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">{test.label}</span>
                <h2 className="mt-5 text-lg font-bold text-slate-950">{test.title}</h2>
                <div className="mt-5 space-y-3 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><TargetIcon className="size-4 text-slate-400" />{test.questions}</p>
                  <p className="flex items-center gap-2"><ClockIcon className="size-4 text-slate-400" />{test.duration}</p>
                </div>
                <Button className="mt-6 w-full" variant="secondary" disabled>Coming soon</Button>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

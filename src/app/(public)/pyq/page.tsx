import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, BookIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Previous Year Questions",
  description: "Explore NEET previous-year questions organised by year and subject.",
};

const years = [2025, 2024, 2023, 2022, 2021, 2020];

export default function PyqPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <Container className="py-14 sm:py-18">
          <p className="text-sm font-bold uppercase tracking-wider text-green-700">Previous years</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Learn from questions NEET has asked before</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Review recurring concepts, understand question patterns, and practise with year-wise papers.</p>
        </Container>
      </section>
      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {years.map((year, index) => (
              <Card key={year} className="flex items-center gap-4 p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-green-100 text-green-700"><BookIcon /></span>
                <div className="flex-1">
                  <p className="font-bold text-slate-950">NEET {year}</p>
                  <p className="mt-1 text-sm text-slate-500">{index === 0 ? "Content being prepared" : "Year-wise question set"}</p>
                </div>
                <ArrowRightIcon className="size-5 text-slate-300" />
              </Card>
            ))}
          </div>
          <div className="mt-10 rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
            <p className="text-sm font-semibold text-green-300">Phase 0 preview</p>
            <h2 className="mt-2 text-xl font-bold">Question content will follow the data foundation.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Year, subject, chapter, topic, answer, and explanation filters will be connected when the question bank is implemented.</p>
          </div>
        </Container>
      </section>
    </>
  );
}

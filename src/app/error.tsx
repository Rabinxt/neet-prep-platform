"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="grid min-h-[70vh] place-items-center py-16 text-center">
      <div className="reveal-up relative max-w-md rounded-[1.75rem] border border-rose-100 bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <span className="absolute -right-4 -top-8 -z-10 text-[9rem] font-black leading-none text-rose-100/70" aria-hidden="true">!</span>
        <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">Something went wrong</span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">We couldn&apos;t load this page.</h1>
        <p className="mt-3 leading-7 text-slate-600">Please try again. If the problem continues, return to the home page and come back later.</p>
        <Button className="mt-7" onClick={reset}>Try again</Button>
      </div>
    </Container>
  );
}

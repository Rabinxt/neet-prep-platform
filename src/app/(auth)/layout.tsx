import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-white lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="study-grid absolute inset-0 opacity-70" />
        <div className="absolute -left-28 top-1/3 size-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <BrandMark className="relative [&_span:last-child]:text-white" />
        <div className="relative max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">One focused account</p>
          <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-[-0.055em]">Your practice should follow your progress.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Move between anonymous exploration and a secure student account without losing the attempts you have already started.</p>
        </div>
        <div className="relative grid grid-cols-3 gap-3 text-sm">
          {[["01", "Practise"], ["02", "Review"], ["03", "Improve"]].map(([number, label]) => (
            <div key={number} className="border-t border-white/15 pt-4"><span className="text-emerald-400">{number}</span><p className="mt-1 font-semibold text-white">{label}</p></div>
          ))}
        </div>
      </section>
      <section className="relative flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-violet-500 lg:hidden" />
        <div className="w-full max-w-md">
          <BrandMark className="mb-10 lg:hidden" />
          {children}
        </div>
      </section>
    </main>
  );
}

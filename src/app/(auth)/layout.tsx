import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#f5f8f7] lg:grid-cols-[0.92fr_1.08fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandMark className="relative [&_span:last-child]:text-white" />
        <div className="reveal-up relative max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">One focused account</p>
          <p className="mt-5 text-5xl font-bold leading-[1.05] tracking-[-0.055em]">Your practice should <span className="text-emerald-400">follow your progress.</span></p>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Move between anonymous exploration and a secure student account without losing the attempts you have already started.</p>
        </div>
        <div className="relative grid grid-cols-3 gap-3 text-sm">
          {[["01", "Practise"], ["02", "Review"], ["03", "Improve"]].map(([number, label]) => (
            <div key={number} className="border-t border-white/15 pt-4"><span className="text-emerald-400">{number}</span><p className="mt-1 font-semibold text-white">{label}</p></div>
          ))}
        </div>
      </section>
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 sm:px-8">
        <div className="absolute bottom-0 left-0 size-72 rounded-full bg-sky-100/50 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-violet-500 lg:hidden" />
        <div className="reveal-up relative w-full max-w-md rounded-[1.75rem] border border-white bg-white/80 p-1 shadow-[0_30px_90px_rgba(16,33,28,0.08)] backdrop-blur sm:p-7 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <BrandMark className="mb-10 lg:hidden" />
          {children}
        </div>
      </section>
    </main>
  );
}

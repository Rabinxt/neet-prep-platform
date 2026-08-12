import { cn } from "@/lib/utils";

export function SubjectMotif({ slug, className }: { slug: string; className?: string }) {
  if (slug === "physics") {
    return (
      <svg viewBox="0 0 420 280" aria-hidden="true" className={cn("science-motif", className)}>
        <defs><marker id="vector-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" fill="currentColor" /></marker></defs>
        <g fill="none" stroke="currentColor">
          <path className="motif-line" d="M28 232H390M60 258V28" opacity=".22" />
          <path className="motif-line motif-line-delay" d="M60 214C132 190 164 62 274 68c52 3 84 31 112 78" strokeWidth="2" markerEnd="url(#vector-arrow)" />
          <path d="M60 214 176 112" strokeDasharray="5 8" opacity=".45" />
          <circle cx="60" cy="214" r="7" fill="currentColor" stroke="none" />
          <circle cx="176" cy="112" r="5" fill="currentColor" stroke="none" opacity=".6" />
          <path d="M94 232V218M138 232V218M182 232V218M226 232V218M270 232V218M314 232V218M358 232V218" opacity=".25" />
        </g>
      </svg>
    );
  }

  if (slug === "chemistry") {
    return (
      <svg viewBox="0 0 420 280" aria-hidden="true" className={cn("science-motif", className)}>
        <g fill="none" stroke="currentColor">
          <ellipse className="motif-orbit" cx="210" cy="140" rx="150" ry="54" opacity=".32" />
          <ellipse className="motif-orbit motif-orbit-reverse" cx="210" cy="140" rx="150" ry="54" transform="rotate(60 210 140)" opacity=".24" />
          <ellipse className="motif-orbit" cx="210" cy="140" rx="150" ry="54" transform="rotate(-60 210 140)" opacity=".24" />
          <path className="motif-line" d="m112 94 48-28 48 28v56l-48 28-48-28Zm96 56 48 28 48-28v-56l-48-28-48 28" opacity=".48" />
        </g>
        <g fill="currentColor"><circle cx="210" cy="140" r="10" /><circle cx="60" cy="140" r="5" /><circle cx="342" cy="92" r="5" /><circle cx="288" cy="236" r="5" /><circle cx="160" cy="66" r="6" /><circle cx="304" cy="150" r="6" /></g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 420 280" aria-hidden="true" className={cn("science-motif", className)}>
      <g fill="none" stroke="currentColor">
        <path className="motif-cell" d="M83 56c42-31 103-21 137 10 33 31 65 20 101 39 47 25 56 91 15 126-43 38-99 15-145 25-54 11-121-6-131-60-9-49 20-88 23-140Z" opacity=".38" />
        <path className="motif-cell motif-cell-inner" d="M130 86c30-22 67-12 91 11 25 23 59 18 79 43 24 31 5 78-34 89-35 10-62-9-96-2-42 8-76-27-67-65 7-30 6-54 27-76Z" opacity=".28" />
        <path className="motif-line" d="M118 206c38-53 70-45 99-76 24-26 45-31 89-36M152 91c16 34 29 58 65 78 28 16 43 37 51 66" strokeDasharray="4 8" />
      </g>
      <g fill="currentColor"><circle cx="118" cy="206" r="6" /><circle cx="217" cy="130" r="10" /><circle cx="306" cy="94" r="6" /><circle cx="152" cy="91" r="5" /><circle cx="268" cy="235" r="7" /></g>
    </svg>
  );
}
